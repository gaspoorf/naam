import {
  CHAPTER1_TEXTS,
  CHAPTER2_TEXTS,
  CHAPTER3_TEXTS,
  CHAPTER4_TEXTS,
} from "~/constants";
import Renderer from "./Renderer";
import Chapter1Scene from "./scenes/Chapter1Scene";
import Chapter2Scene from "./scenes/Chapter2Scene";
import Chapter3Scene from "./scenes/Chapter3Scene";
import Chapter4Scene from "./scenes/Chapter4Scene";
import IntroScene from "./scenes/IntroScene";
import OutroScene from "./scenes/OutroScene";
import SceneManager from "./scenes/SceneManager";
import TitleScene from "./scenes/TitleScene";
import sounds from "./sounds";
import sources from "./sources";
import Controls from "./utils/Controls";
import Debug from "./utils/Debug";
import { EventEmitter } from "./utils/EventEmitter";
import Resources from "./utils/Resources";
import Sizes from "./utils/Sizes";
import SoundManager from "./utils/SoundManager";
import Time from "./utils/Time";

export type ExperienceEvents = {
  "ui:display-next": boolean;
  "ui:info-text": string | null;
  "ui:popin-text": string | null;
  "scene:changed": { index: number };
  "scene:transitioning": boolean;
  "experience:ready": void;
};
export default class Experience {
  private static _instance: Experience | null = null;

  public canvas: HTMLCanvasElement;
  public sizes: Sizes;
  public time: Time;
  public resources: Resources;
  public soundManager: SoundManager;
  public renderer: Renderer;
  public controls: Controls;
  public debug: Debug;
  declare public sceneManager: SceneManager;
  public events = new EventEmitter();

  constructor(canvas: HTMLCanvasElement) {
    // Global access
    if (Experience._instance) {
      throw new Error(
        "Experience is a singleton. Use Experience.getInstance()",
      );
    }
    Experience._instance = this;

    // Options
    this.canvas = canvas;

    // Setup
    this.sizes = new Sizes();
    this.time = new Time();
    this.resources = new Resources(sources);
    this.soundManager = new SoundManager(sounds);
    this.renderer = new Renderer(this);
    this.debug = new Debug();
    this.controls = new Controls(this);

    // Sizes resize event
    this.sizes.on("resize", () => {
      this.resize();
    });

    // Time tick event
    this.time.on("tick", () => {
      if (this.renderer.instance.initialized) this.update();
    });

    this.resources.on("ready", () => {
      this.sceneManager = new SceneManager(this, this.resources);

      this.sceneManager.add(new IntroScene(this));

      this.sceneManager.add(
        new TitleScene(
          this,
          CHAPTER1_TEXTS.title,
          1,
          CHAPTER1_TEXTS.infoInteractionText,
          CHAPTER1_TEXTS.infoInteractionIcon,
        ),
      );
      this.sceneManager.add(new Chapter1Scene(this));
      this.sceneManager.add(
        new TitleScene(
          this,
          CHAPTER2_TEXTS.title,
          2,
          CHAPTER2_TEXTS.infoInteractionText,
          CHAPTER2_TEXTS.infoInteractionIcon,
        ),
      );
      this.sceneManager.add(new Chapter2Scene(this));
      this.sceneManager.add(
        new TitleScene(
          this,
          CHAPTER3_TEXTS.title,
          3,
          CHAPTER3_TEXTS.infoInteractionText,
          CHAPTER3_TEXTS.infoInteractionIcon,
        ),
      );
      this.sceneManager.add(new Chapter3Scene(this));
      this.sceneManager.add(
        new TitleScene(
          this,
          CHAPTER4_TEXTS.title,
          4,
          CHAPTER4_TEXTS.infoInteractionText,
          CHAPTER4_TEXTS.infoInteractionIcon,
        ),
      );
      this.sceneManager.add(new Chapter4Scene(this));

      this.sceneManager.add(new OutroScene(this));

      this.sceneManager.init();
    });

    console.log("Experience class instantiated");
  }

  public static getInstance(): Experience {
    if (!Experience._instance) {
      throw new Error("Experience has not been instantiated yet.");
    }
    return Experience._instance;
  }

  public resize() {
    this.renderer.resize();
    this.sceneManager?.resize();
  }

  public update() {
    this.controls.update();
    if (this.sceneManager) this.sceneManager.update();
  }

  public destroy() {
    this.sizes.off("resize");
    this.time.off("tick");
    this.sceneManager?.destroy();
    this.sizes.destroy();
    this.renderer.instance.dispose();
    Experience._instance = null;

    console.log("Experience class destroyed");
  }
}
