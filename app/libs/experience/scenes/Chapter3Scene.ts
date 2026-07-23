import gsap from "gsap";
import { bilateralBlur } from "three/addons/tsl/display/BilateralBlurNode.js";
// import { chromaticAberration } from "three/addons/tsl/display/ChromaticAberrationNode.js";
import { depthAwareBlend } from "three/addons/tsl/display/depthAwareBlend.js";
import { godrays } from "three/addons/tsl/display/GodraysNode.js";
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";
import {
  color,
  convertToTexture,
  float,
  int,
  mrt,
  output,
  uniform,
} from "three/tsl";
import * as THREE from "three/webgpu";
import { CHAPTER3_TEXTS } from "~/constants";
import { disposeBindings } from "../../../utils/debug";
import { vignette } from "../effects/nodes/VignetteNode";
import type Experience from "../Experience";
import Raycaster from "../utils/Raycaster";
import Environment from "../world/chapter3/Environment";
import World from "../world/chapter3/World";
import BaseScene from "./BaseScene";

export default class Chapter3Scene extends BaseScene {
  private debugDisposables: (() => void)[] = [];
  private environment: Environment;
  public world: World;
  public raycaster: Raycaster;
  public mouse: THREE.Vector2;
  private baseCameraPos = new THREE.Vector3();
  public cameraTargetPosition = new THREE.Vector3(1.7, 1, -9);

  private lightSphere!: THREE.Mesh;
  private postPointLight!: THREE.PointLight;
  private readonly lightPos = new THREE.Vector3(0, 3, 20);

  private interaction = 0;
  private shakeTime = 0;
  private shakeIntensity = 0;
  private zoomIntensity = 0;

  constructor(experience: Experience) {
    super(experience);

    this.scene.name = "Les veilleurs";

    //camera
    this.camera.instance.fov = 35;
    this.camera.instance.far = 40;
    this.camera.instance.near = 0.1;
    this.camera.instance.position.set(
      this.cameraTargetPosition.x,
      this.cameraTargetPosition.y,
      this.cameraTargetPosition.z,
    );
    this.camera.instance.updateProjectionMatrix();
    // this.camera.setOrbitControls();
    this.baseCameraPos.copy(this.camera.instance.position);

    // raycaster
    this.mouse = experience.controls.normalizedMouse;
    this.raycaster = new Raycaster(experience, this.camera.instance);
    this.world = new World(this);
    this.environment = new Environment(this);

    this.setupLightSphere();
    this.setDebugMode(false);
  }

  private setupLightSphere() {
    const sphereGeometry = new THREE.SphereGeometry(0.01, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x061d2c });
    this.lightSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.lightSphere.position.copy(this.lightPos);
    this.lightSphere.castShadow = false;
    this.lightSphere.receiveShadow = false;
    this.scene.add(this.lightSphere);

    this.postPointLight = new THREE.PointLight(0x061d2c, 500, 700);
    this.postPointLight.castShadow = true;
    this.postPointLight.shadow.bias = -0.7;
    this.postPointLight.shadow.mapSize.width = 2048;
    this.postPointLight.shadow.mapSize.height = 2048;
    this.postPointLight.position.copy(this.lightPos);
    this.scene.add(this.postPointLight);
  }

  private cameraParallax() {
    if (this.world.isTransitioning) return;

    const parallaxStrength = 0.2;
    const targetX =
      this.cameraTargetPosition.x - this.mouse.x * (parallaxStrength + 0.2);
    const targetY =
      this.cameraTargetPosition.y + this.mouse.y * parallaxStrength;

    this.camera.instance.position.x +=
      (targetX - this.camera.instance.position.x) * 0.01;
    this.camera.instance.position.y +=
      (targetY - this.camera.instance.position.y) * 0.01;
  }

  override onEnter(): void {
    this.uiScene.setPopinText(CHAPTER3_TEXTS.popinText || null, 1);
    this.uiScene.setTitleText(CHAPTER3_TEXTS.headerTitle || null, 1);

    this.soundManager.play("s3-ambient");
    this.soundManager.items["s3-ambient"]?.fade(0, 0.3, 2000);
  }

  override onLeave(): void {
    this.uiScene.clearTexts();
    this.uiScene.setInfoText(null);
    this.uiScene.setPopinText(null);

    this.soundManager.items["s3-ambient"]?.fade(0.3, 0, 2000);
  }

  override getOutputNode(scenePass: THREE.PassNode) {
    scenePass.setMRT(
      mrt({
        output,
        bloomIntensity: float(0.03),
      }),
    );

    const scenePassColor = scenePass.getTextureNode("output");
    const scenePassDepth = scenePass.getTextureNode("depth");
    const bloomMask = scenePass.getTextureNode("bloomIntensity");

    const godraysPass = godrays(
      scenePassDepth,
      this.camera.instance,
      this.postPointLight,
    );
    godraysPass.raymarchSteps.value = 64;
    godraysPass.density.value = 20;
    godraysPass.maxDensity.value = 40;
    godraysPass.distanceAttenuation.value = 45;

    const godraysPassColor = godraysPass.getTextureNode().mul(0.5);
    const blurPassColor = bilateralBlur(godraysPassColor).getTextureNode();

    const bloomInput = scenePassColor.mul(bloomMask);
    const bloomPass = bloom(bloomInput, 1, 0.4, 0);

    let finalNode: any = scenePassColor.add(bloomPass);

    // finalNode = chromaticAberration(
    //   finalNode,
    //   this.caStrength,
    //   this.caCenter,
    //   this.caScale,
    // );

    const blendColor = uniform(color(0x729ba7));
    const edgeRadius = uniform(int(2));
    const edgeStrength = uniform(float(0.5));

    const sceneWithGodrays = depthAwareBlend(
      convertToTexture(finalNode),
      blurPassColor,
      scenePassDepth,
      this.camera.instance,
      { blendColor, edgeRadius, edgeStrength },
    );

    const finalOutput = vignette(sceneWithGodrays);

    return finalOutput;
  }

  public interact() {
    this.interaction += 1;
    const interactionText =
      CHAPTER3_TEXTS.interactionText[this.interaction - 1];
    if (interactionText) {
      this.uiScene.clearTexts();
      this.uiScene.addText(
        interactionText,
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
          duration: 5,
        },
      );
    }
    const voiceSound = CHAPTER3_TEXTS.entityVoices?.[this.interaction - 1];
    if (voiceSound) {
      this.soundManager.play(voiceSound, 0.8);
    }
  }

  public lastInteraction() {
    const lastInteractionText = CHAPTER3_TEXTS.lastInteractionText;
    if (lastInteractionText) {
      this.uiScene.clearTexts();
      this.uiScene.addText(
        lastInteractionText,
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
          duration: 8,
        },
      );
    }
  }

  public startCameraShake(peakIntensity = 1.0, rampUp = 2, shakeDelay = 0.8) {
    this.zoomIntensity = 0;
    this.shakeIntensity = 0;
    gsap.to(this, { zoomIntensity: peakIntensity, duration: rampUp, ease: "power2.inOut" });
    gsap.delayedCall(shakeDelay, () => {
      gsap.to(this, { shakeIntensity: peakIntensity, duration: rampUp - shakeDelay, ease: "power2.inOut" });
    });
  }

  public stopCameraShake(duration = 4) {
    gsap.to(this, { shakeIntensity: 0, duration, ease: "power2.inOut" });
    gsap.to(this, { zoomIntensity: 0, duration, ease: "power2.inOut" });
  }

  update() {
    const dt = this.experience.time.delta / 1000;

    this.camera.update();
    // this.debugCamera?.update();
    this.world.update();
    this.environment.update();
    this.raycaster.update();
    this.cameraParallax();

    if (this.shakeIntensity > 0.05) {
      this.shakeTime += dt * 40;
      const shakeAmplitude = this.shakeIntensity * 0.01;
      this.camera.instance.position.x += Math.sin(this.shakeTime * 1.1) * shakeAmplitude;
      this.camera.instance.position.y += Math.cos(this.shakeTime * 1.3) * shakeAmplitude;
    }

    const targetFOV = 35 - this.zoomIntensity * 5;
    this.camera.instance.fov = THREE.MathUtils.lerp(
      this.camera.instance.fov,
      targetFOV,
      0.05,
    );
    this.camera.instance.updateProjectionMatrix();
  }

  override destroy() {
    disposeBindings(this.debugDisposables);
    this.world.destroy();
    super.destroy();
  }
}
