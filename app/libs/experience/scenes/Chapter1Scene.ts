import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";
import { convertToTexture, float, mrt, output } from "three/tsl";
import * as THREE from "three/webgpu";
import type { FolderApi } from "tweakpane";
import { CHAPTER1_TEXTS } from "~/constants/index";
import { vignette } from "../effects/nodes/VignetteNode";
import type Experience from "../Experience";
import Raycaster from "../utils/Raycaster";
import Environment from "../world/chapter1/Environment";
import World from "../world/chapter1/World";
import BaseScene from "./BaseScene";

export default class Chapter1Scene extends BaseScene {
  private environment: Environment;
  public world: World;
  public raycaster: Raycaster;
  public debugFolder: FolderApi;

  // LOGICS
  private interactionCount: number = CHAPTER1_TEXTS.interactionText.length;
  private interaction = 0;

  constructor(experience: Experience) {
    super(experience);

    // DEBUG
    this.debugFolder = experience.debug.addFolder("📖 Chapitre 1", false);

    // SCENE SETUP
    this.scene.name = "L'appel";

    // CAMERA
    this.camera.instance.fov = 45;
    this.camera.instance.far = 20;
    this.camera.instance.near = 1;
    this.camera.instance.updateProjectionMatrix();

    // RAYCASTER
    this.raycaster = new Raycaster(experience, this.camera.instance);

    // DEBUG MODE
    // this.camera.setDebug();
    // this.setDebugMode(true);

    // WORLD
    this.world = new World(this);

    // ENVIRONMENT
    this.environment = new Environment(this);
  }

  override getOutputNode(scenePass: THREE.PassNode) {
    scenePass.setMRT(
      mrt({
        output,
        bloomIntensity: float(0.03),
      }),
    );

    const scenePassColor = scenePass.getTextureNode("output");
    const bloomMask = scenePass.getTextureNode("bloomIntensity");
    const bloomInput = scenePassColor.mul(bloomMask);
    const bloomPass = bloom(bloomInput, 0.5, 0.5, 0.1);
    const vignettePass = vignette(
      bloomPass.add(convertToTexture(scenePassColor)),
    );
    return vignettePass;
  }

  override onEnter(): void {
    this.uiScene.setPopinText(CHAPTER1_TEXTS.popinText || null, 1.5);
    this.uiScene.setTitleText(CHAPTER1_TEXTS.headerTitle || null, 1.5);

    this.soundManager.play("s1-ambient");
    this.soundManager.items["s1-ambient"]?.fade(0, 0.3, 2000);
  }

  override onLeave(): void {
    this.uiScene.clearTexts();
    this.uiScene.setInfoText(null);
    this.uiScene.setPopinText(null);

    this.soundManager.items["s1-ambient"]?.fade(0.3, 0, 2000);
  }

  public interact() {
    this.interaction += 1;
    const interactionText =
      CHAPTER1_TEXTS.interactionText[this.interaction - 1];
    const voiceSound = CHAPTER1_TEXTS.entityVoices?.[this.interaction - 1];
    if (voiceSound) {
      this.soundManager.play(voiceSound, 0.8);
    }
    if (this.interaction === this.interactionCount) {
      this.uiScene.setNext(true, 5);
    }

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
  }

  update() {
    this.camera.update();
    this.debugCamera?.update();
    this.world.update();
    this.environment.update();
    this.raycaster.update();
  }

  override destroy() {
    this.world.destroy();
    super.destroy();
  }
}
