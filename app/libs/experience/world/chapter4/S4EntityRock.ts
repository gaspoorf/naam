import gsap from "gsap";
import { color, float, texture, vec4 } from "three/tsl";
import * as THREE from "three/webgpu";
import { COLORS } from "~/constants";
import Experience from "../../Experience";

export default class S4EntityRock extends THREE.Group {
  private soundManager = Experience.getInstance().soundManager;
  public eyes: THREE.Mesh;
  private eyesRevealGroup: THREE.Group;
  private rock: THREE.Mesh;

  constructor(base: THREE.Object3D) {
    super();

    base.updateWorldMatrix(true, false);
    this.applyMatrix4(base.matrixWorld);

    // EYES
    const eyesChild = base.children.find((child) =>
      child.name.includes("eye"),
    ) as THREE.Mesh;

    if (eyesChild) {
      const baseMat = (
        eyesChild.material as THREE.MeshStandardMaterial
      ).clone();

      const baseTexture = baseMat.map;

      this.eyesRevealGroup = new THREE.Group();
      this.eyesRevealGroup.position.copy(eyesChild.position);
      this.eyesRevealGroup.position.z += 0.015;
      this.eyesRevealGroup.scale.y = 0;
      this.eyes = eyesChild.clone();

      this.eyes.material = new THREE.MeshStandardNodeMaterial({
        colorNode: vec4(
          color(COLORS.entityColor).mul(10).rgb,
          texture(baseTexture!).a,
        ),
        alphaTestNode: float(0.9),
        fog: false,
      });

      this.eyes.position.set(0, 0, 0);
      this.eyes.rotation.copy(eyesChild.rotation);
      this.eyes.scale.copy(eyesChild.scale);

      this.eyesRevealGroup.add(this.eyes);
      this.add(this.eyesRevealGroup);
    } else {
      throw new Error("Eyes mesh not found in base object");
    }

    // ROCK
    const rockChild = base.children.find((child) =>
      child.name.includes("rock"),
    ) as THREE.Mesh;

    if (rockChild) {
      this.rock = rockChild.clone();
      this.add(this.rock);
    } else {
      throw new Error("Rock mesh not found in base object");
    }
  }

  private playBlink() {
    const notes = [-5, -3, 0, 2, 4, 7, 9];
    const semitones = notes[Math.floor(Math.random() * notes.length)]!;
    const rate = Math.pow(2, semitones / 12);
    this.soundManager.playRate("s3blink", rate);
  }

  public reveal() {
    gsap.to(this.eyesRevealGroup.scale, {
      y: 1,
      duration: 2,
      ease: "power2.out",
      delay: 1.5 + gsap.utils.random(0, 1),
      onStart: () => {
        this.playBlink();
      },
    });
  }
}
