import { convertToTexture, Fn, nodeObject, uv, vec4 } from "three/tsl";
import * as THREE from "three/webgpu";

export default class GreyScaleNode extends THREE.TempNode {
  private inputNode: THREE.TextureNode;

  static get type() {
    return "GreyScaleNode";
  }

  constructor(inputNode: THREE.TextureNode) {
    super("vec4");
    this.inputNode = inputNode;
  }

  override setup() {
    const outputNode = Fn(() => {
      const inputNode = this.inputNode;
      const inputColor = inputNode.sample(uv());
      const gray = inputColor.r.add(inputColor.g).add(inputColor.b).div(3.0);
      return vec4(gray, gray, gray, inputColor.a);
    })();

    return outputNode;
  }
}

export const greyScale = (node: THREE.Node) =>
  nodeObject(new GreyScaleNode(convertToTexture(node)));
