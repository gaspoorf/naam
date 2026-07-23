import gsap from "gsap";
import { pass } from "three/tsl";
import * as THREE from "three/webgpu";
import type { InteractionIconType } from "~/types/ui";
import Experience from "../Experience";
import Text, { type TextOptions } from "../world/Text";

interface TextAnimationOptions {
  delay: number;
  duration?: number;
}

export default class UIScene {
  private experience: Experience;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  private texts: Text[] = [];
  private pass: THREE.PassNode | null = null;
  private delayedCalls: gsap.core.Tween[] = [];
  private timelines: gsap.core.Timeline[] = [];

  constructor() {
    this.experience = Experience.getInstance();
    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.camera = new THREE.PerspectiveCamera(
      50,
      this.experience.sizes.width / this.experience.sizes.height,
      0.1,
      5,
    );
    this.camera.position.set(0, 0, 3);
    this.camera.lookAt(0, 0, 0);
    this.pass = pass(this.scene, this.camera);
  }

  addText(
    content: string,
    options?: TextOptions,
    animationOptions?: TextAnimationOptions,
  ): void {
    if (animationOptions) {
      if (!animationOptions.duration) {
        const tween = gsap.delayedCall(animationOptions.delay, () => {
          const t = new Text(content, options);
          this.scene.add(t);
          this.texts.push(t);
        });
        this.delayedCalls.push(tween);
        return;
      }

      const tl = gsap.timeline();
      tl.call(
        () => {
          const t = new Text(content, options);
          this.scene.add(t);
          this.texts.push(t);
          tl.data = { text: t };
        },
        undefined,
        animationOptions.delay,
      ).call(
        () => {
          const t = tl.data?.text as Text | undefined;
          if (!t) return;
          t.destroy();
          this.texts = this.texts.filter((text) => text !== t);
        },
        undefined,
        `+=${animationOptions.duration}`,
      );

      this.timelines.push(tl);
      return;
    }

    const t = new Text(content, options);
    this.scene.add(t);
    this.texts.push(t);
  }

  clearTexts() {
    this.texts.forEach((t) => t.destroy());
    this.texts = [];
  }

  getUiPass() {
    return this.pass;
  }

  // VUE UI
  public setNext(value: boolean, delay = 0) {
    if (delay === 0) {
      this.experience.events.trigger("ui:display-next", [{ value }]);
      return;
    }
    const tween = gsap.delayedCall(delay, () => {
      this.experience.events.trigger("ui:display-next", [{ value }]);
    });
    this.delayedCalls.push(tween);
  }

  public setInfoText(value: string | null) {
    this.experience.events.trigger("ui:info-text", [{ value }]);
  }

  public setInfoInteractionIcon(value: InteractionIconType | null) {
    this.experience.events.trigger("ui:info-interaction-icon", [{ value }]);
  }

  public setPopinText(value: string | null, delay = 0) {
    if (delay === 0) {
      this.experience.events.trigger("ui:popin-text", [{ value }]);
      return;
    }
    const tween = gsap.delayedCall(delay, () => {
      this.experience.events.trigger("ui:popin-text", [{ value }]);
    });
    this.delayedCalls.push(tween);
  }

  public setTitleText(value: string | null, delay = 0) {
    if (delay === 0) {
      this.experience.events.trigger("ui:title-text", [{ value }]);
      return;
    }
    const tween = gsap.delayedCall(delay, () => {
      this.experience.events.trigger("ui:title-text", [{ value }]);
    });
    this.delayedCalls.push(tween);
  }

  // BASE
  resize() {
    this.camera.aspect =
      this.experience.sizes.width / this.experience.sizes.height;
    this.camera.updateProjectionMatrix();
    this.texts.map((text) => text.repositionInViewport());
  }

  destroy() {
    this.delayedCalls.forEach((t) => t.kill());
    this.delayedCalls = [];
    this.timelines.forEach((tl) => tl.kill());
    this.timelines = [];
    this.clearTexts();
  }
}
