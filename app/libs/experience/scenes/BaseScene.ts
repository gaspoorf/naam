// core/scenes/BaseScene.ts
import * as THREE from "three/webgpu";
import Camera from "../Camera";
import type Experience from "../Experience";
import type Renderer from "../Renderer";
import type SoundManager from "../utils/SoundManager";
import type SceneManager from "./SceneManager";
import type UIScene from "./UIScene";

export default abstract class BaseScene {
  public experience: Experience;
  public renderer: Renderer;
  public sceneManager: SceneManager;
  public soundManager: SoundManager;
  public uiScene: UIScene;
  public scene: THREE.Scene;
  public camera: Camera;
  public debugCamera: Camera | null = null;
  public pipeline: THREE.RenderPipeline | null = null;

  public debugEnabled = false;

  constructor(experience: Experience) {
    this.experience = experience;
    this.renderer = experience.renderer;
    this.soundManager = experience.soundManager;
    this.sceneManager = experience.sceneManager;
    this.uiScene = experience.sceneManager.uiScene;

    this.scene = new THREE.Scene();
    this.camera = new Camera(
      this.experience,
      this.scene,
      new THREE.Vector3(0, 0, 5),
    );

    this.scene.add(this.camera.instance);
  }

  public getOutputNode(scenePass: THREE.PassNode): any {
    return scenePass.getTextureNode("output");
  }

  public setDebugMode(value: boolean) {
    this.debugEnabled = value;
    if (this.debugEnabled) {
      this.debugCamera = new Camera(
        this.experience,
        this.scene,
        new THREE.Vector3(0, 0, 5),
        35,
        0.1,
        100,
      );
      this.debugCamera.setOrbitControls(true);
      this.scene.add(this.debugCamera.instance);
    } else {
      if (this.debugCamera) {
        this.scene.remove(this.debugCamera.instance);
        this.debugCamera = null;
      }
    }
  }

  public abstract update(): void;

  public onEnter(): void {}
  public onLeave(): void {}

  public resize() {
    this.camera.resize();
    if (this.debugCamera) this.debugCamera.resize();
  }

  public destroy() {
    this.scene.traverse((child: any) => {
      if (child.isMesh) {
        child.geometry.dispose();
        Object.values(child.material).forEach((value: any) => {
          if (value?.dispose) value.dispose();
        });
      }
    });
  }
}
