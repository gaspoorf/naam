import gsap from "gsap";
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";
import { convertToTexture, float, mrt, output } from "three/tsl";
import * as THREE from "three/webgpu";
import type { FolderApi } from "tweakpane";
import { CHAPTER2_TEXTS } from "~/constants";
import type Experience from "../Experience";
import { vignette } from "../effects/nodes/VignetteNode";
import Raycaster from "../utils/Raycaster";
import Environment from "../world/chapter2/Environment";
import World from "../world/chapter2/World";
import BaseScene from "./BaseScene";

export default class Chapter2Scene extends BaseScene {
  public debugFolder: FolderApi;
  private world: World;
  private environment: Environment;
  public raycaster: Raycaster;
  public mouse: THREE.Vector2;
  private baseCameraPos = new THREE.Vector3();
  public isDisplayed = false;

  private debugDisposables: (() => void)[] = [];
  private shakeTime = 0;

  constructor(experience: Experience) {
    super(experience);

    // DEBUG
    this.debugFolder = experience.debug.addFolder("📖 Chapitre 2", false);

    // SCENE SETUP
    this.scene.name = "Horizon";

    // CAMERA
    this.camera.instance.position.set(0, 1.2, 7.5);
    this.baseCameraPos.copy(this.camera.instance.position);
    this.camera.instance.fov = 25;
    this.camera.instance.far = 68;
    this.camera.instance.near = 5;
    // this.camera.setDebug();
    // this.setDebugMode(true);

    // RAYCASTER
    this.mouse = experience.controls.normalizedMouse;
    this.raycaster = new Raycaster(experience, this.camera.instance);

    // ENVIRONMENT
    this.environment = new Environment(this);

    // WORLD
    this.world = new World(this);
  }

  public override onEnter(): void {
    this.isDisplayed = true;
    this.camera.instance.position.z -= 3;
    gsap.to(this.camera.instance.position, {
      z: this.baseCameraPos.z,
      duration: 2,
      delay: 0.5,
      ease: "power1.out",
    });
    this.uiScene.setPopinText(CHAPTER2_TEXTS.popinText || null, 1.5);
    this.uiScene.setTitleText(CHAPTER2_TEXTS.headerTitle || null, 1.5);

    this.soundManager.play("s2-ambient");
    this.soundManager.items["s2-ambient"]?.fade(0, 0.3, 2000);
  }

  override onLeave(): void {
    this.isDisplayed = false;
    this.uiScene.clearTexts();
    this.uiScene.setInfoText(null);
    this.uiScene.setPopinText(null);

    this.soundManager.items["s2-ambient"]?.fade(0.3, 0, 2000);
  }

  private cameraParallax() {
    const parallaxStrength = 0.2;
    const targetX =
      this.baseCameraPos.x + this.mouse.x * (parallaxStrength + 0.2);
    const targetY = this.baseCameraPos.y + this.mouse.y * parallaxStrength;

    this.camera.instance.position.x +=
      (targetX - this.camera.instance.position.x) * 0.01;
    this.camera.instance.position.y +=
      (targetY - this.camera.instance.position.y) * 0.01;
  }

  override getOutputNode(scenePass: THREE.PassNode) {
    scenePass.setMRT(
      mrt({
        output,
        bloomIntensity: float(0.03),
      }),
    );
    const scenePassColor = scenePass.getTextureNode("output");
    const bloomPass = bloom(scenePassColor, 0.5, 0.5, 1.2);
    const vignettePass = vignette(
      bloomPass.add(convertToTexture(scenePassColor)),
    );
    return vignettePass;
  }

  public interact() {
    const soundName = CHAPTER2_TEXTS.entityVoices?.[0];
    if (soundName) {
      this.soundManager.play(soundName, 0.8);
    }
    this.uiScene.addText(
      CHAPTER2_TEXTS.interactionText as string,
      {
        fontName: "lato",
        letterSpacing: 0,
        lineHeight: 60,
        fontSize: 12,
        align: "left",
        anchor: "bottom-left",
        offset: { x: 0.1, y: -0.05 },
      },
      {
        delay: 0.5,
        duration: 6,
      },
    );
    this.uiScene.setNext(true, 8);
  }

  public update() {
    const dt = this.experience.time.delta / 1000;
    const intensity = this.world.animation.cameraHoldIntensity;

    const targetFOV = 25 - intensity * 3;
    this.camera.instance.fov = THREE.MathUtils.lerp(
      this.camera.instance.fov,
      targetFOV,
      0.1,
    );
    this.camera.instance.updateProjectionMatrix();

    if (intensity > 0.1) {
      this.shakeTime += dt * 40;
      const shakeAmplitude = intensity * 0.01;
      const shakeX = Math.sin(this.shakeTime * 1.1) * shakeAmplitude;
      const shakeY = Math.cos(this.shakeTime * 1.3) * shakeAmplitude;

      this.camera.instance.position.x += shakeX;
      this.camera.instance.position.y += shakeY;
    }

    this.camera.instance.lookAt(0, 5, -30);
    this.debugCamera?.update();
    this.cameraParallax();

    this.environment.update();
    this.world.update();
  }

  public override destroy() {
    disposeBindings(this.debugDisposables);

    this.world.destroy();

    super.destroy();
  }
}
