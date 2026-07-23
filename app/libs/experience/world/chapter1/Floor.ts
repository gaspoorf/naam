import * as THREE from "three/webgpu";
import type Camera from "../../Camera";

export default class Floor extends THREE.Mesh {
  private readonly camera: Camera;

  constructor(camera: Camera, size: number = 25) {
    const geometry = new THREE.PlaneGeometry(size, size);
    const material = new THREE.MeshStandardMaterial({
      color: "#29322b",
      roughness: 1,
      metalness: 0,
    });

    super(geometry, material);
    this.rotation.x = -Math.PI / 2;
    this.updateMatrixWorld();
    this.camera = camera;
  }

  public update() {
    const { x, z } = this.camera.instance.position;
    this.position.set(x, 0, z - 15);
    this.updateMatrixWorld();
  }
}
