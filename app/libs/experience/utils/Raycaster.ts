import * as THREE from "three/webgpu";
import type Experience from "../Experience";

export default class Raycaster extends THREE.Raycaster {
  public override camera: THREE.Camera;
  public mouse: THREE.Vector2;

  constructor(experience: Experience, camera: THREE.Camera) {
    super();
    this.camera = camera;
    this.mouse = experience.controls.normalizedMouse;
    console.log("Raycaster class instantiated");
  }

  public setCamera(camera: THREE.Camera) {
    this.camera = camera;
  }

  public update() {
    this.setFromCamera(this.mouse, this.camera);
  }
}
