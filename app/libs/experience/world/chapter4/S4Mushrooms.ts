import { color, float, uniform } from "three/tsl";
import * as THREE from "three/webgpu";
import { COLORS } from "~/constants";

type MushroomData = { uniform: THREE.UniformNode<"float", number>; target: number };

export default class S4Mushrooms extends THREE.Group {
  private meshUniforms = new Map<THREE.Mesh, MushroomData>();

  constructor(base: THREE.Object3D) {
    super();

    base.updateWorldMatrix(true, false);
    this.applyMatrix4(base.matrixWorld);

    base.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const brightnessUniform = uniform(float(2.5));
        const mushroom = child.clone();
        mushroom.position.y += 0.2;
        mushroom.material = new THREE.MeshStandardNodeMaterial({
          roughness: 1,
          metalness: 0,
          fog: false,
          colorNode: color(COLORS.entityColor).mul(brightnessUniform),
        });
        this.add(mushroom);
        this.meshUniforms.set(mushroom, { uniform: brightnessUniform, target: 2.5 });
      }
    });
  }

  public setHovered(hoveredMesh: THREE.Mesh | null) {
    for (const [mesh, data] of this.meshUniforms) {
      data.target = mesh === hoveredMesh ? 5 : 2.5;
    }
  }

  public update(delta: number) {
    for (const data of this.meshUniforms.values()) {
      data.uniform.value = THREE.MathUtils.lerp(
        data.uniform.value,
        data.target,
        delta * 4.0,
      );
    }
  }
}
