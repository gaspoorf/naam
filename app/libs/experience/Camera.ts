import { OrbitControls } from "three/examples/jsm/Addons.js";
import * as THREE from "three/webgpu";
import type Experience from "./Experience";

export default class Camera {
  private experience: Experience;
  private sizes: Experience["sizes"];
  private scene: THREE.Scene;
  private canvas: Experience["canvas"];

  public instance!: THREE.PerspectiveCamera;
  public controls: OrbitControls | null = null;

  private controlsEnabled = false;
  private debugEnabled = false;
  private debugHelper: THREE.CameraHelper | null = null;

  constructor(
    experience: Experience,
    scene: THREE.Scene,
    position: THREE.Vector3,
    fov = 35,
    near = 0.1,
    far = 10,
  ) {
    this.experience = experience;
    this.sizes = this.experience.sizes;
    this.scene = scene;
    this.canvas = this.experience.canvas;

    this.setInstance(position, fov, near, far);
  }

  setInstance(position: THREE.Vector3, fov: number, near: number, far: number) {
    this.instance = new THREE.PerspectiveCamera(
      fov,
      this.sizes.width / this.sizes.height,
      near,
      far,
    );
    this.instance.position.set(position.x, position.y, position.z);
    this.scene.add(this.instance);
  }

  setOrbitControls(value = true) {
    this.controlsEnabled = value;

    if (!this.controlsEnabled) {
      if (this.controls) {
        this.controls.dispose();
        this.controls = null;
      }
      return;
    }
    this.controls = new OrbitControls(this.instance, this.canvas);
    this.controls.enableDamping = true;
  }

  setDebug(value = true) {
    this.debugEnabled = value;
    if (!this.debugEnabled) {
      if (this.debugHelper) {
        this.scene.remove(this.debugHelper);
        this.debugHelper = null;
      }
      return;
    }
    this.debugHelper = new THREE.CameraHelper(this.instance);
    this.scene.add(this.debugHelper);
  }

  resize() {
    this.instance.aspect = this.sizes.width / this.sizes.height;
    this.instance.updateProjectionMatrix();
  }

  update() {
    if (this.controlsEnabled && this.controls) this.controls.update();
    if (this.debugEnabled && this.debugHelper) this.debugHelper.update();
  }
}
