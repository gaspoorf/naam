import {
  cameraPosition,
  color,
  dot,
  float,
  mx_worley_noise_float,
  normalLocal,
  normalWorld,
  positionWorld,
  smoothstep,
  time,
  uniform,
  uv,
} from "three/tsl";
import * as THREE from "three/webgpu";

export interface GodraySettings {
  position?: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  topRadius?: number;
  bottomRadius?: number;
  height?: number;
  timeSpeed?: number;
  noiseScale?: number;
  smoothBottom?: number;
  smoothTop?: number;
  fresnelPower?: number;
}

export default class Godrays extends THREE.Mesh {
  public override material: THREE.MeshStandardNodeMaterial;
  public override geometry: THREE.CylinderGeometry;

  private settings: GodraySettings;

  private uniforms: {
    noiseScale: any;
    color: any;
    timeSpeed: any;
    smoothTop: any;
    smoothBottom: any;
    fresnelPower: any;
  };

  constructor(settings: GodraySettings = {}) {
    super();

    const {
      position = [0, 0, 0],
      rotation = [0, 0, 0],
      color: godrayColor = "white",
      topRadius = 1.7,
      bottomRadius = 2,
      height = 14.5,
      timeSpeed = 0.08,
      noiseScale = 4.4,
      smoothBottom = 0.332,
      smoothTop = 0.574,
      fresnelPower = 2.9,
    } = settings;
    this.settings = settings;

    this.geometry = new THREE.CylinderGeometry(
      topRadius,
      bottomRadius,
      height,
      64,
      1,
      true,
    );

    this.uniforms = {
      noiseScale: uniform(float(noiseScale)),
      color: uniform(color(godrayColor)),
      timeSpeed: uniform(float(timeSpeed)),
      smoothTop: uniform(float(smoothTop)),
      smoothBottom: uniform(float(smoothBottom)),
      fresnelPower: uniform(float(fresnelPower)),
    };

    const customUV = normalLocal
      .mul(this.uniforms.noiseScale)
      .add(time.mul(this.uniforms.timeSpeed));

    const noise = mx_worley_noise_float(customUV);

    const smooth = smoothstep(0, this.uniforms.smoothBottom, uv().y).mul(
      smoothstep(1.001, this.uniforms.smoothTop, uv().y),
    );

    const viewDirection = cameraPosition.sub(positionWorld).normalize();
    const invertedFresnel = dot(normalWorld, viewDirection)
      .abs()
      .pow(this.uniforms.fresnelPower);

    const alpha = noise.mul(invertedFresnel).mul(smooth);

    this.material = new THREE.MeshStandardNodeMaterial();
    this.material.colorNode = color(0, 0, 0);
    this.material.opacityNode = alpha as unknown as THREE.Node;
    this.material.emissiveNode = this.uniforms.color as unknown as THREE.Node;
    this.material.transparent = true;
    this.material.depthWrite = false;

    this.position.set(...position);
    this.rotation.set(...rotation);
  }

  update(progress: number) {
    // this.uniforms.smoothBottom.value = this.settings.smoothBottom || 0.4 * 0;
    this.uniforms.smoothBottom.value =
      1 - (1 - (this.settings.smoothBottom || 0.4)) * progress;
    this.uniforms.smoothTop.value =
      0 + (this.settings.smoothTop || 0.2) * progress;
  }

  public destroy(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
