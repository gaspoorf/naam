import {
  convertToTexture,
  dot,
  float,
  floor,
  Fn,
  fract,
  If,
  mod,
  nodeObject,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import * as THREE from "three/webgpu";

export default class PixelationNode extends THREE.TempNode {
  private inputNode: THREE.TextureNode;
  private uniforms: {
    uResolution: THREE.UniformNode<"vec2", THREE.Vector2>;
    uPixelSize: THREE.UniformNode<"vec2", THREE.Vector2>;
  };

  static get type() {
    return "PixelationNode";
  }

  constructor(inputNode: THREE.TextureNode, width: number, height: number) {
    super("vec4");
    this.inputNode = inputNode;
    this.uniforms = {
      uResolution: uniform(new THREE.Vector2(width, height)),
      uPixelSize: uniform(new THREE.Vector2(8, 8)),
    };
  }

  public setSize(width: number, height: number) {
    this.uniforms.uResolution.value.set(width, height);
  }

  override setup() {
    const outputNode = Fn(() => {
      const inputNode = this.inputNode;
      const resolution = this.uniforms.uResolution;
      const pixelSize = this.uniforms.uPixelSize;
      const uvNode = uv();

      const maskStagger = float(0.5);
      const normalizedPixelSize = pixelSize.div(resolution);

      const coord = uvNode.div(normalizedPixelSize);
      const columnStagger = mod(floor(coord.x), float(2.0)).mul(maskStagger);

      const offsetUV = vec2(
        uvNode.x,
        uvNode.y.add(columnStagger.mul(normalizedPixelSize.y)),
      );

      const uvPixel = normalizedPixelSize.mul(
        floor(offsetUV.div(normalizedPixelSize)),
      );

      const color = inputNode.sample(uvPixel);
      const luma = dot(vec3(0.2126, 0.7152, 0.0722), color.rgb);
      const cellUV = fract(uvNode.mul(resolution).div(pixelSize));

      const lineWidth = float(1.0);
      If(luma.greaterThan(0.3), () => lineWidth.assign(0.7));
      If(luma.greaterThan(0.5), () => lineWidth.assign(0.5));
      If(luma.greaterThan(0.7), () => lineWidth.assign(0.3));
      If(luma.greaterThan(0.9), () => lineWidth.assign(0.1));
      If(luma.greaterThan(0.99), () => lineWidth.assign(0.0));

      const finalColor = vec4(0.0);
      const yStart = float(0);
      const yEnd = float(1);

      If(
        cellUV.y
          .greaterThan(yStart)
          .and(cellUV.y.lessThan(yEnd))
          .and(cellUV.x.greaterThan(0.0))
          .and(cellUV.x.lessThan(lineWidth)),
        () => finalColor.assign(vec4(0.01, 0.01, 0.01, 1.0)),
      ).Else(() => finalColor.assign(vec4(0.8, 0.78, 0.79, 1.0)));

      return finalColor;
    })();

    return outputNode;
  }
}

export const pixelationNode = (
  node: THREE.Node,
  width: number,
  height: number,
) => nodeObject(new PixelationNode(convertToTexture(node), width, height));
