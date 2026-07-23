import { color, float, mrt, uniform } from "three/tsl";
import * as THREE from "three/webgpu";
import { COLORS } from "~/constants";

export default class Mushroom extends THREE.Mesh {
  private bloomUniform = uniform(float(0.5));
  public targetBloom = 0.5;

  constructor(base: THREE.Object3D) {
    super();

    base.updateWorldMatrix(true, false);
    this.applyMatrix4(base.matrixWorld);

    if (base instanceof THREE.Mesh) {
      this.geometry = base.geometry;
      const mat = new THREE.MeshStandardNodeMaterial({
        roughness: 1,
        metalness: 0,
        colorNode: color(COLORS.entityColor).mul(20),
      });
      mat.mrtNode = mrt({ bloomIntensity: this.bloomUniform });
      this.material = mat;
    } else {
      throw new Error("Base object must be a mesh");
    }
  }

  public update(delta: number) {
    this.bloomUniform.value = THREE.MathUtils.lerp(
      this.bloomUniform.value,
      this.targetBloom,
      delta * 4.0,
    );
  }
}
