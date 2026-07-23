import { SkeletonUtils, type GLTF } from "three/examples/jsm/Addons.js";
import { color, Fn, If, mrt, texture, vec3, vec4 } from "three/tsl";
import * as THREE from "three/webgpu";
import { COLORS } from "~/constants";
import Experience from "../Experience";
import PlayerAnimator from "./PlayerAnimator";

export interface PlayerOptions {
  scale?: number;
  position?: THREE.Vector3Like;
  rotationY?: number;
}

export default class Player extends THREE.Group {
  private resources = Experience.getInstance().resources;

  public animator!: PlayerAnimator;
  public model!: THREE.Group;

  private time = Experience.getInstance().time;
  private options: Required<PlayerOptions>;

  constructor(options: PlayerOptions = {}) {
    super();
    this.options = {
      scale: options.scale ?? 1,
      position: options.position ?? { x: 0, y: 0.35, z: 0 },
      rotationY: options.rotationY ?? 0,
    };

    const gltf = this.resources.items.naamModel as GLTF | undefined;
    if (gltf) {
      this._setup(gltf);
    } else {
      console.warn("Player: naamModel not found in resources");
    }
  }

  private _setup(gltf: GLTF) {
    this.model = SkeletonUtils.clone(gltf.scene) as THREE.Group;

    // Normalise scale
    const box = new THREE.Box3().setFromObject(this.model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0)
      this.model.scale.multiplyScalar(this.options.scale / maxDim);

    // Ground the model
    this.model.updateWorldMatrix(true, true);
    // const groundedBox = new THREE.Box3().setFromObject(this.model);
    this.position.set(
      this.options.position.x,
      this.options.position.y,
      this.options.position.z,
    );
    this.rotation.y = this.options.rotationY;
    this.scale.setScalar(this.options.scale);
    this.model.updateMatrixWorld(true);

    this.model.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;

      const baseMaterial = mesh.material as THREE.MeshStandardMaterial;

      const finalColor = Fn(() => {
        const baseTexture = baseMaterial.map as THREE.Texture;

        if (baseTexture) {
          const sampledColor = texture(baseTexture).rgb;
          const returnedColor = color(COLORS.entityColor).mul(20);

          If(sampledColor.r.lessThan(0.85), () => {
            returnedColor.assign(sampledColor);
          });

          return returnedColor;
        } else {
          return vec3(1, 0, 0);
        }
      });

      const customMaterial = new THREE.MeshStandardNodeMaterial({
        colorNode: vec4(finalColor(), 1.0),
        mrtNode: mrt({ bloomIntensity: finalColor().r.mul(0.3) }),
        roughness: 1,
        metalness: 0,
      });
      mesh.material = customMaterial;
    });

    this.add(this.model);
    this.animator = new PlayerAnimator(this.model, gltf);
  }

  public update() {
    const delta = this.time.delta / 1000;
    this.animator?.update(delta);
  }

  public destroy() {
    this.animator?.destroy();
    this.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      mats.forEach((m) => (m as THREE.Material)?.dispose());
    });
    this.removeFromParent();
  }
}
