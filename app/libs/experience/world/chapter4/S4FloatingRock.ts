import * as THREE from "three/webgpu";
import Experience from "../../Experience";
import type Time from "../../utils/Time";

export default class S4FloatingRock extends THREE.Group {
  private index: number;
  private time: Time;
  private rock: THREE.Mesh;

  constructor(base: THREE.Object3D, index = 0) {
    super();

    this.time = Experience.getInstance().time;
    this.index = index;

    base.updateWorldMatrix(true, false);
    this.applyMatrix4(base.matrixWorld);

    if (base instanceof THREE.Mesh) {
      this.rock = base.clone();
      this.rock.position.set(0, 0, 0);
      this.rock.rotation.set(0, 0, 0);
      this.add(this.rock);
    } else {
      throw new Error("Base object is not a mesh");
    }
  }

  update() {
    const t = this.time.elapsed * 0.001;
    this.rock.position.y = Math.sin(t + this.index * 20) * 0.05;
  }
}
