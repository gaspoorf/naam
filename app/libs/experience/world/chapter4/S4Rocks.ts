import * as THREE from "three/webgpu";

export default class S4Rocks extends THREE.Group {
  constructor(base: THREE.Object3D) {
    super();

    base.updateWorldMatrix(true, false);
    this.applyMatrix4(base.matrixWorld);

    base.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const rock = child.clone();
        this.add(rock);
      }
    });
  }
}
