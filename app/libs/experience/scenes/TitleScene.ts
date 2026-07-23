// scenes/TitleScene.ts
import gsap from "gsap";
import * as THREE from "three/webgpu";
import type { InteractionIconType } from "~/types/ui";
import type Experience from "../Experience";
import BaseScene from "./BaseScene";

export default class TitleScene extends BaseScene {
  private title: string;
  private chapterIndex: number;
  private infoText?: string;
  private icon?: InteractionIconType;

  constructor(
    experience: Experience,
    title: string,
    chapterIndex: number,
    infoText?: string,
    icon?: InteractionIconType,
  ) {
    super(experience);

    this.title = title;
    this.chapterIndex = chapterIndex;
    this.infoText = infoText;
    this.icon = icon;
    this.scene.name = "TitleScene";
    this.scene.background = new THREE.Color("#070D1C");
    this.camera.instance.position.set(0, 0, 5);
  }

  override onEnter() {
    this.uiScene.addText(this.title, {
      fontSize: 80,
    });
    this.uiScene.setTitleText(`Chapitre ${toRoman(this.chapterIndex)}`, 1);
    this.uiScene.setInfoText(this.infoText || null);
    this.uiScene.setInfoInteractionIcon(this.icon || null);
    this.soundManager.animateFilterEngage();

    gsap.delayedCall(6, () => {
      this.sceneManager.next();
    });
  }

  override onLeave() {
    this.uiScene.clearTexts();
    this.uiScene.setInfoText(null);
    this.uiScene.setInfoInteractionIcon(null);
    this.soundManager.animateFilterRelease();
  }

  update() {}
}
