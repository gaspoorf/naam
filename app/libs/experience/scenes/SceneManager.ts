import gsap from "gsap";
import { transition } from "three/addons/tsl/display/TransitionNode.js";
import { pass, uniform } from "three/tsl";
import * as THREE from "three/webgpu";
import Experience from "../Experience";
import type Resources from "../utils/Resources";
import BaseScene from "./BaseScene";
import IntroScene from "./IntroScene";
import UIScene from "./UIScene";

export default class SceneManager {
  private experience: Experience;
  private renderer: THREE.WebGPURenderer;
  private renderPipeline: THREE.RenderPipeline;

  private scenes: BaseScene[] = [];
  public uiScene: UIScene;
  declare public introScene: IntroScene;
  private currentIndex = 0;
  private fromIndex = 0;
  private toIndex = 0;

  private isTransitioning = false;
  private transitionValue = uniform(0);
  private transitionTexture: any;

  private pipelines: Map<string, THREE.RenderPipeline> = new Map();
  private passByScene: Map<BaseScene, THREE.PassNode> = new Map();

  private debugDisposables: (() => void)[] = [];

  constructor(experience: Experience, resources: Resources) {
    this.experience = experience;
    this.renderer = experience.renderer.instance;
    this.renderPipeline = new THREE.RenderPipeline(this.renderer);
    this.transitionTexture = new THREE.TextureNode(
      resources.items.transitionTexture as THREE.Texture,
    );
    this.uiScene = new UIScene();
  }

  // -- Helpers ────────────────────────────────────────────────────────────────

  private pipelineKey(from: number, to?: number) {
    return to !== undefined ? `${from}->${to}` : `${from}`;
  }

  // ── Scenes ────────────────────────────────────────────────────────────────

  public add(scene: BaseScene) {
    this.scenes.push(scene);
    if (scene instanceof IntroScene) {
      this.introScene = scene;
    }
    const scenePass = pass(scene.scene, scene.camera.instance);
    this.passByScene.set(scene, scenePass);
  }

  public async init() {
    if (this.scenes.length <= 0) return;

    for (let i = 0; i < this.scenes.length; i++) {
      this.prebuildPipeline(i);
    }

    for (let from = 0; from < this.scenes.length; from++) {
      const to = from + 1;
      if (from !== to && to < this.scenes.length) {
        this.prebuildTransitionPipeline(from, to);
      }
    }

    // await this.warmupPipelines();

    this.activatePipeline(this.pipelineKey(0));
    this.scenes[0]!.onEnter();
    // this.buildDebug();

    gsap.delayedCall(0.5, () => {
      this.experience.events.trigger("scene:prebuilded");
      this.warmupPipelines();
    });
  }

  // ── Debug ─────────────────────────────────────────────────────────────────

  private buildDebug() {
    if (!this.experience.debug.active) return;

    const folder = this.experience.debug.addFolder("🎬 Scenes", false);

    this.debugDisposables.push(
      ...addBinding(folder, [
        ...this.scenes.map((scene, i) => ({
          type: "button" as const,
          label: scene.scene.name || `Scene ${i + 1}`,
          onClick: () => this.goTo(i),
        })),
      ]),
    );
  }

  // ── Pipeline ──────────────────────────────────────────────────────────────

  private prebuildPipeline(index: number) {
    const scene = this.scenes[index];
    if (!scene) return;

    const pipeline = new THREE.RenderPipeline(this.renderer);
    const scenePass = pass(
      scene.scene,
      scene.debugCamera ? scene.debugCamera.instance : scene.camera.instance,
    );
    const sceneOutput = scene.getOutputNode(scenePass);
    const uiOutput = this.uiScene.getUiPass()?.getTextureNode("output");

    if (uiOutput) {
      const uiAlpha = uiOutput.a;
      pipeline.outputNode = uiOutput.rgb
        .mul(uiAlpha)
        .add(sceneOutput.rgb.mul(uiAlpha.oneMinus()));
    } else {
      pipeline.outputNode = sceneOutput;
    }

    this.pipelines.set(this.pipelineKey(index), pipeline);
  }

  private prebuildTransitionPipeline(fromIndex: number, toIndex: number) {
    const fromScene = this.scenes[fromIndex];
    const toScene = this.scenes[toIndex];
    if (!fromScene || !toScene) return;

    const pipeline = new THREE.RenderPipeline(this.renderer);
    const passFrom = this.passByScene.get(fromScene)!;
    const passTo = this.passByScene.get(toScene)!;

    const outputFrom = fromScene.getOutputNode(passFrom);
    const outputTo = toScene.getOutputNode(passTo);

    const transitioned = transition(
      outputTo,
      outputFrom,
      this.transitionTexture,
      this.transitionValue,
      0.3,
      1,
    );

    const uiOutput = this.uiScene.getUiPass()?.getTextureNode("output");

    if (uiOutput) {
      const uiAlpha = uiOutput.a;
      pipeline.outputNode = uiOutput.rgb
        .mul(uiAlpha)
        .add((transitioned as any).rgb.mul(uiAlpha.oneMinus()));
    } else {
      pipeline.outputNode = transitioned;
    }

    this.pipelines.set(this.pipelineKey(fromIndex, toIndex), pipeline);
  }

  private activatePipeline(key: string) {
    const pipeline = this.pipelines.get(key);
    if (!pipeline) {
      console.warn(`Pipeline "${key}" not found`);
      return;
    }
    this.renderPipeline = pipeline;
  }

  // private async warmupPipelines() {
  //   console.log("[SceneManager] : warmupPipelines()");

  //   for (const [_, pipeline] of this.pipelines) {
  //     pipeline.render();
  //   }
  // }

  private async warmupPipelines() {
    const BUDGET_MS = 16; // ~la moitié d'une frame à 60fps
    const renderTarget = new THREE.RenderTarget(
      this.experience.sizes.width / 4,
      this.experience.sizes.height / 4,
    );

    const pipelinesToWarm = [...this.pipelines.entries()].filter(
      ([key]) => key !== this.pipelineKey(0),
    );

    for (const [key, pipeline] of pipelinesToWarm) {
      const start = this.experience.time.current;

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          this.renderer.setRenderTarget(renderTarget);
          pipeline.render();
          this.renderer.setRenderTarget(null);
          resolve();
        });
      });

      const elapsed = this.experience.time.current - start;
      if (elapsed > BUDGET_MS * 2) {
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
      }
    }

    console.log("[SceneManager] : all pipelines warmed up");
  }

  // ── Navigation between scenes ─────────────────────────────────────────────────

  public goTo(index: number) {
    if (this.isTransitioning || index === this.currentIndex) return;
    if (index < 0 || index >= this.scenes.length) return;

    this.isTransitioning = true;
    this.fromIndex = this.currentIndex;
    this.toIndex = index;

    // Switch immédiat vers le pipeline de transition prébuildé
    this.activatePipeline(this.pipelineKey(this.fromIndex, this.toIndex));
    this.experience.soundManager.items.transition?.play();
    this.experience.events.trigger("scene:transitioning", [{ value: true }]);
    this.animateTransition();
  }

  private animateTransition() {
    this.transitionValue.value = 0;
    this.scenes[this.fromIndex]?.onLeave();
    this.scenes[this.toIndex]?.onEnter();

    gsap.killTweensOf(this.transitionValue);
    gsap.to(this.transitionValue, {
      value: 1,
      duration: 1.5,
      ease: "power2.in",
      onComplete: () => {
        this.currentIndex = this.toIndex;
        this.isTransitioning = false;
        this.transitionValue.value = 0;

        this.activatePipeline(this.pipelineKey(this.currentIndex));
        this.experience.events.trigger("scene:changed", [
          { index: this.currentIndex },
        ]);
        this.experience.events.trigger("scene:transitioning", [
          { value: false },
        ]);
      },
    });
  }

  public next() {
    const nextIndex = this.currentIndex + 1;
    this.goTo(nextIndex);
  }

  public prev() {
    this.goTo(this.currentIndex - 1);
  }

  // ── Loop ──────────────────────────────────────────────────────────────────

  public update() {
    if (!this.scenes.length) return;

    if (this.isTransitioning) {
      this.scenes[this.fromIndex]?.update();
      this.scenes[this.toIndex]?.update();
    } else {
      this.scenes[this.currentIndex]?.update();
    }

    this.renderPipeline.render();
  }

  public resize() {
    this.scenes.forEach((scene) => scene.resize());
    this.uiScene.resize();
  }

  public destroy() {
    disposeBindings(this.debugDisposables);
    this.scenes.forEach((scene) => scene.destroy());
  }
}
