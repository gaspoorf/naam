// scenes/IntroScene.ts
import gsap from "gsap";
import { convertToTexture } from "three/tsl";
import * as THREE from "three/webgpu";
import { vignette } from "../effects/nodes/VignetteNode";
import type Experience from "../Experience";
import type Resources from "../utils/Resources";
import IntroLogo from "../world/intro/IntroLogo";
import IntroSketch from "../world/intro/IntroSketch";
import BaseScene from "./BaseScene";
export default class IntroScene extends BaseScene {
  private resources: Resources;
  private logo: IntroLogo;
  private sketches: IntroSketch[] = [];

  constructor(experience: Experience) {
    super(experience);

    this.resources = experience.resources;

    this.scene.name = "IntroScene";
    this.scene.background = new THREE.Color("#070D1C");
    this.camera.instance.position.set(0, 0, 5);
    this.logo = new IntroLogo(this.resources);
    this.scene.add(this.logo);
  }

  override onEnter() {
    // this.launchSequence();
  }

  override onLeave() {
    this.uiScene.clearTexts();
  }

  public launchSequence() {
    this.logo.hide();

    // TEXT 1
    const sketch1 = new IntroSketch(
      this.scene,
      // new THREE.Vector3(-1, 0.5, 0),
      new THREE.Vector3(0, 0, 0),
      this.resources.items.introSketch1 as THREE.Texture<HTMLImageElement>,
      {
        delay: 0.2,
        revealDuration: 3.25,
        holdDuration: 3,
        hideDuration: 3,
      },
    );
    // sketch1.rotation.z = 0.1;
    this.sketches.push(sketch1);

    this.uiScene.addText(
      "Depuis toujours, les Onaari vivent au coeur de la forêt.\nIls survivent en puisant l'énergie de la nature qui les\nentoure : le vent, les plantes, la terre...",
      {
        fontName: "lato",
        letterSpacing: 0,
        lineHeight: 60,
        fontSize: 12,
        align: "left",
        anchor: "center-left",
        // offset: { y: -0.4 },
      },
      {
        delay: 0,
        duration: 8,
      },
    );

    // TEXT 2
    const sketch2 = new IntroSketch(
      this.scene,
      // new THREE.Vector3(1, -0.5, 0),
      new THREE.Vector3(0, 0, 0),
      this.resources.items.introSketch2 as THREE.Texture<HTMLImageElement>,
      {
        delay: 9.5,
        revealDuration: 2.8,
        holdDuration: 0,
        hideDuration: 3,
      },
    );
    // sketch2.rotation.z = -0.1;
    this.sketches.push(sketch2);

    this.uiScene.addText(
      "Mais parmi eux est né un être différent...",
      {
        fontName: "lato",
        letterSpacing: 0,
        lineHeight: 60,
        fontSize: 12,
        align: "left",
        anchor: "center-left",
        // offset: { y: 0.4 },
      },
      {
        delay: 9.1,
        duration: 5,
      },
    );

    // TEXT 3
    const sketch3 = new IntroSketch(
      this.scene,
      // new THREE.Vector3(-1, 0.5, 0),
      new THREE.Vector3(0, 0, 0),
      this.resources.items.introSketch3 as THREE.Texture<HTMLImageElement>,
      {
        delay: 15.5,
        revealDuration: 3,
        holdDuration: 2,
        hideDuration: 2,
      },
    );
    // sketch3.rotation.z = 0.1;
    this.sketches.push(sketch3);

    this.uiScene.addText(
      "Son nom est Naam, les siens ont décidé que\nsa place n'était pas parmi eux...",
      {
        fontName: "lato",
        letterSpacing: 0,
        lineHeight: 60,
        fontSize: 12,
        align: "left",
        anchor: "center-left",
        // offset: { y: -0.4 },
      },
      {
        delay: 14.8,
        duration: 7,
      },
    );

    gsap.delayedCall(20, () => {
      this.sceneManager.next();
    });
  }

  override getOutputNode(scenePass: THREE.PassNode) {
    const scenePassColor = scenePass.getTextureNode("output");
    const vignettePass = vignette(convertToTexture(scenePassColor));
    return vignettePass;
  }

  public override resize(): void {
    this.camera.resize();
    this.sketches.forEach((sketch) => sketch.resize());
  }

  update() {
    this.sketches.forEach((sketch) => sketch.update());
  }
}
