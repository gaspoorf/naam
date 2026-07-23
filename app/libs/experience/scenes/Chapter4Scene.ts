import gsap from "gsap";
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";
import { convertToTexture, float, mrt, output } from "three/tsl";
import * as THREE from "three/webgpu";
import type { FolderApi } from "tweakpane";
import { CHAPTER4_TEXTS } from "~/constants";
import { vignette } from "../effects/nodes/VignetteNode";
import type Experience from "../Experience";
import Raycaster from "../utils/Raycaster";
import type Time from "../utils/Time";
import Environment from "../world/chapter4/Environment";
import World from "../world/chapter4/World";
import BaseScene from "./BaseScene";

export default class Chapter4Scene extends BaseScene {
  private time: Time;

  public world: World;
  private environment: Environment;
  public raycaster: Raycaster;
  public mouse: THREE.Vector2;
  public debugFolder: FolderApi;
  private baseCameraPos = new THREE.Vector3();

  // CAMERA
  private shakeTime = 0;
  private shakeAmount = 0;
  private baseFov = 25;
  private zoomFov = 20;

  constructor(experience: Experience) {
    super(experience);
    this.time = experience.time;

    this.debugFolder = experience.debug.addFolder("📖 Chapitre 4", false);

    this.scene.name = "Origine";
    this.mouse = experience.controls.normalizedMouse;
    this.camera.instance.position.set(5, 3, -30);
    this.baseCameraPos.copy(this.camera.instance.position);
    this.camera.instance.fov = 25;
    this.camera.instance.far = 50;
    this.camera.instance.updateProjectionMatrix();

    this.raycaster = new Raycaster(experience, this.camera.instance);
    // this.camera.setDebug();
    // this.camera.setOrbitControls(true);
    this.world = new World(this);
    this.environment = new Environment(this);
    this.camera.instance.lookAt(-1, -3, 0);
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

  override onEnter() {
    this.camera.instance.position.z += 7;
    gsap.to(this.camera.instance.position, {
      z: this.baseCameraPos.z,
      duration: 3,
      delay: 0.5,
      ease: "power1.out",
    });
    this.uiScene.setPopinText(CHAPTER4_TEXTS.popinText || null, 1.5);
    this.uiScene.setTitleText(CHAPTER4_TEXTS.headerTitle || null, 1.5);

    this.soundManager.play("s4-ambient");
    this.soundManager.items["s4-ambient"]?.fade(0, 0.5, 2000);
  }

  override onLeave(): void {
    this.uiScene.clearTexts();
    this.uiScene.setTitleText(null);
    this.uiScene.setInfoText(null);
    this.uiScene.setPopinText(null);

    this.soundManager.items["s4-ambient"]?.fade(0.5, 0, 2000);
  }

  public interact() {
    const interactionText = CHAPTER4_TEXTS.interactionText as string;
    if (!interactionText) return;

    const soundName = CHAPTER4_TEXTS.entityVoices?.[0];
    if (soundName) this.soundManager.play(soundName, 3.8);

    this.uiScene.addText(
      interactionText,
      {
        fontName: "lato",
        letterSpacing: 0,
        lineHeight: 60,
        fontSize: 12,
        align: "left",
        anchor: "bottom-left",
      },
      {
        delay: 3.5,
        duration: 6,
      },
    );
    this.uiScene.setNext(true, 10);
  }

  // CAMERA
  private cameraParallax() {
    const parallaxStrength = 0.2;
    const targetX =
      this.baseCameraPos.x - this.mouse.x * (parallaxStrength + 0.2);
    const targetY = this.baseCameraPos.y + this.mouse.y * parallaxStrength;

    this.camera.instance.position.x +=
      (targetX - this.camera.instance.position.x) * 0.01;
    this.camera.instance.position.y +=
      (targetY - this.camera.instance.position.y) * 0.01;
  }

  private updateCameraShake(progress: number, dt: number) {
    const isHolding = progress > 0.1 && progress < 1;
    const targetShake = isHolding ? progress * 0.01 : 0;
    const shakeSpeed = progress >= 1 ? 2.5 : 10;
    const shakeLerpFactor = 1 - Math.exp(-dt * shakeSpeed);
    this.shakeAmount += (targetShake - this.shakeAmount) * shakeLerpFactor;
    if (this.shakeAmount <= 0.00001) return;
    this.shakeTime += dt * 40;
    const shakeX = Math.sin(this.shakeTime * 1.1) * this.shakeAmount;
    const shakeY = Math.cos(this.shakeTime * 1.3) * this.shakeAmount;
    this.camera.instance.position.x += shakeX;
    this.camera.instance.position.y += shakeY;
  }

  private updateCameraZoom(progress: number, dt: number) {
    const targetFov =
      progress < 1
        ? THREE.MathUtils.lerp(this.baseFov, this.zoomFov, progress)
        : this.baseFov;
    const zoomSpeed = progress >= 1 ? 1.8 : 8;
    const zoomLerpFactor = 1 - Math.exp(-dt * zoomSpeed);
    this.camera.instance.fov +=
      (targetFov - this.camera.instance.fov) * zoomLerpFactor;
    this.camera.instance.updateProjectionMatrix();
  }

  // Make the camera go up +1 along Y axis, synchro to the hold
  private updateCameraLift(progress: number) {
    const liftAmount = 1;
    const targetY = this.baseCameraPos.y + liftAmount * progress;
    this.camera.instance.position.y +=
      (targetY - this.camera.instance.position.y) * 0.01;
  }

  // MAIN LOOP
  public update() {
    const progress = this.world.holdProgress;
    const dt = this.time.delta / 1000;

    this.cameraParallax();
    this.updateCameraShake(progress, dt);
    this.updateCameraZoom(progress, dt);
    this.updateCameraLift(progress);
    this.camera.instance.lookAt(-1, -3, 0);

    this.raycaster.update();
    this.environment.update();
    this.world.update();
  }

  public override destroy(): void {
    this.world.destroy();
    this.environment.destroy();
    super.destroy();
  }
}
