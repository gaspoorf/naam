import {
  cameraPosition,
  color,
  mix,
  positionWorld,
  smoothstep,
  float,
  mrt,
  uniform,
} from "three/tsl";
import * as THREE from "three/webgpu";
import { COLORS } from "~/constants";

export default class Mushroom extends THREE.Mesh {
  private bloomUniform = uniform(float(0.5));
  public targetBloom = 1.5;

  constructor(base: THREE.Object3D) {
    super();

    this.name = "mushroom";
    base.updateWorldMatrix(true, false);
    this.applyMatrix4(base.matrixWorld);

    if (base instanceof THREE.Mesh) {
      this.geometry = base.geometry;

      const distanceToCamera = positionWorld.z.distance(cameraPosition.z);
      const distanceFade = smoothstep(12, 14, distanceToCamera);
      const colorMultiplier = mix(7, 1, distanceFade);

      const mat = new THREE.MeshStandardNodeMaterial({
        roughness: 1,
        metalness: 0,
        colorNode: color(COLORS.entityColor).mul(colorMultiplier),
      });
      mat.mrtNode = mrt({ bloomIntensity: this.bloomUniform });
      this.material = mat;
      this.position.y += 0.2;
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
