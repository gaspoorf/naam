import { float, texture, vec4 } from "three/tsl";
import * as THREE from "three/webgpu";

export default class Mountain extends THREE.Mesh {
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
        colorNode: vec4(1, 0, 0, texture(baseTexture).a),
        // colorNode: vec3(uv(), 1),
        transparent: false,
        alphaTestNode: float(0),
        side: THREE.DoubleSide,
      });
    } else {
      throw new Error("Base object must be a mesh");
    }
  }
}
