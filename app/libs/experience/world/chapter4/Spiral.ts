import {
  color,
  mix,
  mx_noise_float,
  positionWorld,
  smoothstep,
  step,
  texture,
  uniform,
} from "three/tsl";
import * as THREE from "three/webgpu";
import { COLORS } from "~/constants";
import type Resources from "../../utils/Resources";

export default class Spiral extends THREE.Mesh {
  private veinsTexture: THREE.Texture<HTMLImageElement>;

  private uProgress: THREE.UniformNode<"float", number> = uniform(1);
  private uWorldMinY = uniform(0);
  private uWorldMaxY = uniform(1);
  private uRevealSoftness = uniform(0.12);
  private uNoiseScale = uniform(1.5);
  private uNoiseStrength = uniform(0.5);

  constructor(base: THREE.Object3D, resources: Resources) {
    super();

    this.veinsTexture = resources.items
      .spiralTexture as THREE.Texture<HTMLImageElement>;
    this.veinsTexture.flipY = false;
    this.veinsTexture.colorSpace = THREE.SRGBColorSpace;
    this.veinsTexture.minFilter = THREE.LinearMipmapLinearFilter;
    this.veinsTexture.magFilter = THREE.LinearFilter;
    this.veinsTexture.generateMipmaps = true;
    this.veinsTexture.anisotropy = 16;
    this.veinsTexture.needsUpdate = true;

    base.updateWorldMatrix(true, false);
    this.applyMatrix4(base.matrixWorld);

    if (base instanceof THREE.Mesh) {
      this.geometry = base.geometry;
      this.updateWorldMatrix(true, false);

      const baseMat = base.material as THREE.MeshStandardMaterial;
      const baseTex = baseMat.map;
      if (!baseTex) {
        throw new Error("Base material must have a texture map");
      }

      const box = new THREE.Box3().setFromObject(this);
      this.uWorldMinY.value = box.min.y;
      this.uWorldMaxY.value = box.max.y;

      const worldY01 = positionWorld.y
        .sub(this.uWorldMinY)
        .div(this.uWorldMaxY.sub(this.uWorldMinY));

      const noise = mx_noise_float(positionWorld.mul(this.uNoiseScale)).mul(
        this.uNoiseStrength,
      );

      const noisyWorldY01 = worldY01.add(noise);

      const progress = smoothstep(0.2, 1, this.uProgress);
      const revealMask = smoothstep(
        noisyWorldY01,
        noisyWorldY01.add(this.uRevealSoftness),
        progress,
      );

      const veinsStrength = step(0.3, texture(this.veinsTexture).a).mul(
        revealMask,
      );

      this.material = new THREE.MeshStandardNodeMaterial({
        colorNode: mix(
          texture(baseTex),
          color(COLORS.entityColor).mul(10),
          veinsStrength,
        ),
        roughness: 1,
        metalness: 0,
        side: THREE.BackSide,
      });
    } else {
      throw new Error("Base object must be a mesh");
    }
  }

  update(progress: number) {
    this.uProgress.value = progress;
  }
}
