// scenes/IntroScene.ts
import gsap from "gsap";
import { convertToTexture } from "three/tsl";
import * as THREE from "three/webgpu";
import { vignette } from "../effects/nodes/VignetteNode";
import type Experience from "../Experience";
import type Resources from "../utils/Resources";
import IntroSketch from "../world/intro/IntroSketch";
import BaseScene from "./BaseScene";

export default class OutroScene extends BaseScene {
  private resources: Resources;
  private sketches: IntroSketch[] = [];

  constructor(experience: Experience) {
    super(experience);

    this.resources = experience.resources;

    this.scene.name = "OutroScene";
    this.scene.background = new THREE.Color("#070D1C");
    this.camera.instance.position.set(0, 0, 5);
  }

  override onEnter() {
    this.launchSequence();
    this.soundManager.animateFilterEngage();
  }

  override onLeave() {
    this.uiScene.clearTexts();
  }

  public launchSequence() {
    this.soundManager.play("outro");
    this.soundManager.items["outro"]?.fade(0, 0.4, 2000);

    // TEXT 1
    this.uiScene.addText(
      "Naam a trouvé sa place, son role. A partir de maintenant,\ncomme ceux qui l'ont guidé dans sa quête,\nil veillera sur les sentiers du monde.",
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
        duration: 7,
      },
    );

    // TEXT 2
    this.uiScene.addText(
      "Lorsqu'un autre être perdu marchera seul sous les arbres,\nil sera là. Sous la forme d'une lueur, un murmure,\nun signe presque imperceptible.",
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
        delay: 7.5,
        duration: 7,
      },
    );

    // TEXT 3
    this.uiScene.addText(
      "Car dans la nature, lorsqu'on trouve sa place,\non ne quitte jamais vraiment le monde.\nOn devient une part de lui.",
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
        delay: 15,
        duration: 7,
      },
    );

    const sketch1 = new IntroSketch(
      this.scene,
      // new THREE.Vector3(-1, 0.5, 0),
      new THREE.Vector3(0, 0, 0),
      this.resources.items.outroSketch1 as THREE.Texture<HTMLImageElement>,
      {
        delay: 0.5,
        revealDuration: 3,
        holdDuration: 1.5,
        hideDuration: 3,
      },
    );
    this.sketches.push(sketch1);

    const sketch2 = new IntroSketch(
      this.scene,
      // new THREE.Vector3(-1, 0.5, 0),
      new THREE.Vector3(0, 0, 0),
      this.resources.items.outroSketch2 as THREE.Texture<HTMLImageElement>,
      {
        delay: 8,
        revealDuration: 3,
        holdDuration: 1.5,
        hideDuration: 3,
      },
    );
    this.sketches.push(sketch2);

    const sketch3 = new IntroSketch(
      this.scene,
      // new THREE.Vector3(-1, 0.5, 0),
      new THREE.Vector3(0, 0, 0),
      this.resources.items.outroSketch3 as THREE.Texture<HTMLImageElement>,
      {
        delay: 15.5,
        revealDuration: 3,
        holdDuration: 1.5,
        hideDuration: 3,
      },
    );
    this.sketches.push(sketch3);

    this.uiScene.addText(
      "fin",
      {
        fontSize: 120,
      },
      {
        delay: 22,
      },
    );

    gsap.delayedCall(24, () => {
      this.experience.events.trigger("end");
      this.soundManager.items["outro"]?.fade(0.4, 0, 4000);
    });
  }

  override getOutputNode(scenePass: THREE.PassNode) {
    const scenePassColor = scenePass.getTextureNode("output");
    const vignettePass = vignette(convertToTexture(scenePassColor));
    return vignettePass;
  }

  public override resize(): void {
    this.sketches.forEach((sketch) => sketch.resize());
  }

  update() {
    this.sketches.forEach((sketch) => sketch.update());
  }
}
