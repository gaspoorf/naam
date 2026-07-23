import {
  cameraPosition,
  color,
  float,
  mix,
  mrt,
  positionWorld,
  smoothstep,
  texture,
  uniform,
  vec3,
  vec4,
} from "three/tsl";
import * as THREE from "three/webgpu";
import { COLORS } from "~/constants";

export default class Rock extends THREE.Group {
  private rock: THREE.Mesh;
  public blob?: THREE.Mesh;
  private bloomUniform = uniform(float(0.5));
  public targetBloom = 0.5;

  constructor(base: THREE.Object3D) {
    super();

    base.updateWorldMatrix(true, false);
    this.applyMatrix4(base.matrixWorld);

    if (base instanceof THREE.Mesh) {
      this.rock = base.clone();
      this.rock.position.set(0, 0, 0);
      this.rock.rotation.set(0, 0, 0);
      this.rock.scale.set(1, 1, 1);
      this.add(this.rock);
    } else {
      const stoneChild = base.children.find(
        (child) => child instanceof THREE.Mesh && child.name.includes("stone"),
      ) as THREE.Mesh | undefined;

      if (stoneChild) {
        this.rock = stoneChild.clone();
        this.add(this.rock);
      } else {
        this.rock = new THREE.Mesh();
      }

      const blobChild = base.children.find(
        (child) => child instanceof THREE.Mesh && child.name.includes("blob"),
      ) as THREE.Mesh | undefined;

      if (blobChild) {
        this.blob = blobChild.clone();
        this.add(this.blob);
      }
    }

    this.initMaterial();
  }

  private initMaterial() {
    if (this.blob) {
      const originalMat = this.blob.material as THREE.MeshStandardMaterial;
      const baseTexture = originalMat.map;

      const distanceToCamera = positionWorld.z.distance(cameraPosition.z);
      const distanceFade = smoothstep(14, 16, distanceToCamera);
      const colorMultiplier = mix(20, 1, distanceFade);

      const blobMat = new THREE.MeshStandardNodeMaterial({
        // map: baseTexture,
        roughness: 1,
        metalness: 0,
        transparent: true,
        colorNode: baseTexture
          ? vec4(
              vec3(color(COLORS.entityColor).mul(colorMultiplier)),
              texture(baseTexture).a,
            )
          : undefined,
      });

      blobMat.mrtNode = mrt({ bloomIntensity: this.bloomUniform });
      this.blob.material = blobMat;
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
