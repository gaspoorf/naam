import {
  color,
  convertToTexture,
  distance,
  float,
  Fn,
  mix,
  nodeObject,
  smoothstep,
  uniform,
  uv,
  vec2,
} from "three/tsl";
import * as THREE from "three/webgpu";

export default class VignetteNode extends THREE.TempNode {
  private inputNode: THREE.TextureNode;
  private uniforms: {
    uColor: THREE.UniformNode<"color", THREE.Color>;
  };

  static get type() {
    return "VignetteNode";
  }

  constructor(inputNode: THREE.TextureNode) {
    super("vec4");
    this.inputNode = inputNode;
    this.uniforms = {
      uColor: uniform(color(0x0c0f17)),
    };
  }

  override setup() {
    const outputNode = Fn(() => {
      const uvNode = uv();

      const r = distance(uvNode, vec2(0.5));
      const edge = smoothstep(float(0.25), float(0.8), r);
      const vignette = float(1.0).sub(edge).pow(1.5);

      const inputColor = this.inputNode.sample(uvNode);
      const vignetteStrength = float(1.0).sub(vignette);

      return mix(inputColor, this.uniforms.uColor.toVec4(), vignetteStrength);
    })();

    return outputNode;
  }
}

export const vignette = (node: THREE.Node) =>
  nodeObject(new VignetteNode(convertToTexture(node)));
