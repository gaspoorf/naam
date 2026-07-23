import gsap from "gsap";
import { float, texture, uniform, uv, vec4 } from "three/tsl";
import * as THREE from "three/webgpu";
import { perlinReveal } from "../../tsl/textEffects";
import type Resources from "../../utils/Resources";

export default class IntroLogo extends THREE.Mesh {
  private resources: Resources;
  private texture: THREE.Texture<HTMLImageElement>;

  private uProgress: THREE.UniformNode<"float", number> = uniform(1);

  constructor(resources: Resources) {
    super();
    this.resources = resources;
    this.texture = this.resources.items
      .logoTexture as THREE.Texture<HTMLImageElement>;

    this.geometry = new THREE.PlaneGeometry(2, 2, 1, 1);
    this.scale.x = this.texture.image.width / 1000;
    this.scale.y = this.texture.image.height / 1000;
    this.position.y = 0.21;

    const uvNode = uv();
    const textureColor = texture(this.texture, uvNode);

    this.material = new THREE.MeshBasicNodeMaterial({
      colorNode: vec4(
        textureColor.rgb,
        textureColor.a.mul(perlinReveal(this.uProgress)),
      ),
      alphaTestNode: float(0.9),
    });
  }

  public hide() {
    gsap.to(this.uProgress, {
      value: 0,
      duration: 1,
      ease: "power1.out",
    });
  }
}
