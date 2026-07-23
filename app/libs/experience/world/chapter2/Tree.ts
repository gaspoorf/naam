import { float, texture } from "three/tsl";
import * as THREE from "three/webgpu";

export default class Tree extends THREE.Mesh {
  constructor(base: THREE.Object3D) {
    super();

    base.updateWorldMatrix(true, true);
    this.applyMatrix4(base.matrixWorld);

    if (base instanceof THREE.Mesh) {
      const baseMat = base.material as THREE.MeshStandardMaterial;
      const baseTexture = baseMat.map as THREE.Texture;

      this.geometry = base.geometry.clone();
      this.material = new THREE.MeshStandardNodeMaterial({
        roughness: 1,
        metalness: 0,
        colorNode: texture(baseTexture),
        // colorNode: vec3(uv(), 1),
        alphaTestNode: float(0.2),
        transparent: false,
        side: THREE.DoubleSide,
      });
    } else {
      throw new Error("Base object must be a mesh");
    }
  }
}
