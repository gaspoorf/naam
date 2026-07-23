import { positionWorld, vec4 } from "three/tsl";
import * as THREE from "three/webgpu";
import type { GrassColorUniforms } from "./grassShaderNodes";
import { groundColorNode } from "./grassShaderNodes";

export default class GreenPlane extends THREE.Mesh<
  THREE.PlaneGeometry,
  THREE.MeshBasicNodeMaterial
> {
  constructor(size = 8, colorUniforms: GrassColorUniforms) {
    super(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicNodeMaterial(),
    );
    this.material.colorNode = vec4(
      groundColorNode(positionWorld.x, positionWorld.z, colorUniforms),
      1.0,
    );
    this.rotation.x = -Math.PI / 2;
    this.updateMatrixWorld(true);
  }

  public setColor(_hex: string) {
    /* color driven by noise */
  }
  public setTexture(_map: THREE.Texture) {
    /* texture replaced by noise */
  }

  public destroy() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
