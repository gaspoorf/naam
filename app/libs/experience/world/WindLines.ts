import gsap from "gsap";
import {
  attribute,
  cameraProjectionMatrix,
  cameraViewMatrix,
  color,
  floor,
  Fn,
  modelWorldMatrix,
  mul,
  positionGeometry,
  uniform,
  vec3,
  vec4,
  vertexIndex,
} from "three/tsl";
import * as THREE from "three/webgpu";
import { WindLineGeometry } from "../geometries/WindLineGeometry";

class WindLine extends THREE.Mesh {
  private _scene: THREE.Scene;
  public available: boolean;

  private uThickness: THREE.UniformNode<"float", number>;
  public uProgress: THREE.UniformNode<"float", number>;

  constructor(
    scene: THREE.Scene,
    thickness: number = 0.05,
    _tangent = vec3(0, 1, -1),
  ) {
    super();

    this._scene = scene;

    this.available = true;

    this.uThickness = uniform(thickness);
    this.uProgress = uniform(0);

    const vertexNode = Fn(() => {
      const worldPosition = modelWorldMatrix.mul(vec4(positionGeometry, 1));
      const tangent = _tangent.normalize();

      const ratio: THREE.AttributeNode<"float"> = attribute("ratio", "float");

      const baseThickness = ratio
        .sub(0.5)
        .abs()
        .mul(2)
        .oneMinus()
        .smoothstep(0, 1);
      const remapedProgress = this.uProgress.mul(3).sub(1);
      const progressThickness = ratio
        .sub(remapedProgress)
        .abs()
        .oneMinus()
        .smoothstep(0, 1);

      const finalThickness = mul(
        this.uThickness,
        baseThickness,
        progressThickness,
      );

      const sideStep = floor(
        vertexIndex.toFloat().mul(3).sub(2).div(3).mod(2),
      ).sub(0.5);
      const sideOffset = tangent.mul(sideStep.mul(finalThickness));

      worldPosition.addAssign(vec4(sideOffset, 0));

      const viewPosition = cameraViewMatrix.mul(worldPosition);
      return cameraProjectionMatrix.mul(viewPosition);
    })();

    this.geometry = new WindLineGeometry(7, 4);

    this.material = new THREE.MeshBasicNodeMaterial({
      // colorNode: color(0x567a8b),
      colorNode: color(0x2b414e),
      normalNode: vec3(0, 1, 0),
      transparent: true,
      vertexNode,
    });
    this.renderOrder = 1;
    this.position.y = 1;
    this.scale.setScalar(0.5);
    this._scene.add(this);
  }
}

export default class WindLines {
  private _scene: THREE.Scene;
  private _target: THREE.Group;

  private intervalRange: { min: number; max: number };
  private duration: number;
  private translation: number;
  private thickness: number;

  private pool: WindLine[];

  constructor(scene: THREE.Scene, target: THREE.Group) {
    this._scene = scene;
    this._target = target;

    this.intervalRange = { min: 1000, max: 3000 };
    this.duration = 4;
    this.translation = 0.1;
    this.thickness = 0.02;

    this.pool = [
      new WindLine(this._scene, this.thickness),
      new WindLine(this._scene, this.thickness),
      new WindLine(this._scene, this.thickness),
      new WindLine(this._scene, this.thickness),
    ];

    const displayInterval = () => {
      this.display();

      setTimeout(
        () => {
          displayInterval();
        },
        this.intervalRange.min +
          Math.random() * (this.intervalRange.max - this.intervalRange.min),
      );
    };

    displayInterval();
  }

  display() {
    const windLine = this.pool.find((windLine) => windLine.available);

    if (!windLine) return;

    // Setup
    windLine.visible = true;
    windLine.available = false;

    // Position and rotation
    const angle = Math.PI / 4;

    windLine.position.x = this._target.position.x + (Math.random() - 0.5) * 7;
    windLine.position.z = this._target.position.z + (Math.random() - 0.5) * 7;

    windLine.rotation.y = angle;

    // Animate position
    gsap.to(windLine.position, {
      x: windLine.position.x + Math.sin(angle) * this.translation,
      z: windLine.position.z + Math.cos(angle) * this.translation,
      duration: this.duration,
    });

    // Animate progress
    gsap.fromTo(
      windLine.uProgress,
      {
        value: 0,
      },
      {
        value: 1,
        duration: this.duration,
        onComplete: () => {
          windLine.visible = false;
          windLine.available = true;
        },
      },
    );
  }
}
