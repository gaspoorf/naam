import gsap from "gsap";
import { color, float, texture, vec4 } from "three/tsl";
import * as THREE from "three/webgpu";
import { COLORS } from "~/constants";

export default class S4EntityTree extends THREE.Group {
  public eyes: THREE.Mesh;
  private tree: THREE.Mesh;

  constructor(base: THREE.Object3D) {
    super();

    base.updateWorldMatrix(true, false);
    this.applyMatrix4(base.matrixWorld);

    // EYES
    const eyesChild = base.children.find(
      (child) => child.name.toLowerCase() === "eyes",
    ) as THREE.Mesh;
    if (eyesChild) {
      const baseMat = (
        eyesChild.material as THREE.MeshStandardMaterial
      ).clone();
      const baseTexture = baseMat.map;
      this.eyes = eyesChild.clone();
      this.eyes.material = new THREE.MeshStandardNodeMaterial({
        colorNode: vec4(
          color(COLORS.entityColor).mul(10).rgb,
          texture(baseTexture!).a,
        ),
        alphaTestNode: float(0.9),
        fog: false,
      });
      this.eyes.position.z += 0.015;
      this.eyes.scale.y = 0;
      this.add(this.eyes);
    } else {
      throw new Error("Eyes mesh not found in base object");
    }

    // TREE
    const treeChild = base.children.find(
      (child) => child.name.toLowerCase() === "tree",
    ) as THREE.Mesh;
    if (treeChild) {
      const baseMat = (
        treeChild.material as THREE.MeshStandardMaterial
      ).clone();
      const baseTexture = baseMat.map;
      this.tree = treeChild.clone();
      this.tree.material = new THREE.MeshStandardNodeMaterial({
        colorNode: texture(baseTexture!),
        roughness: 1,
        metalness: 0,
        alphaTestNode: float(0.9),
      });
      this.add(this.tree);
    } else {
      throw new Error("Tree mesh not found in base object");
    }
  }

  reveal() {
    // EYES
    gsap.to(this.eyes.scale, {
      y: 1,
      duration: 2,
      ease: "power2.out",
      delay: 1.5 + gsap.utils.random(0, 1),
    });
  }
}
