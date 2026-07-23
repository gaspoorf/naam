import * as THREE from "three/webgpu";

export default class Flower extends THREE.Mesh {
  constructor(base: THREE.Object3D) {
    super();

    base.updateWorldMatrix(true, false);
    this.applyMatrix4(base.matrixWorld);

    if (base instanceof THREE.Mesh) {
      this.geometry = base.geometry;
      this.material = base.material;
    } else {
      throw new Error("Base object must be a mesh");
    }
  }
}
