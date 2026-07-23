import gsap from "gsap";
import {
  color,
  float,
  positionLocal,
  texture,
  time,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import * as THREE from "three/webgpu";
import { COLORS } from "~/constants";
import Experience from "../../Experience";
import type Resources from "../../utils/Resources";

export default class Borealis extends THREE.Mesh {
  private resources: Resources;

  public override geometry: THREE.PlaneGeometry;
  public override material: THREE.MeshBasicNodeMaterial;

  private perlinTexture: THREE.Texture<HTMLImageElement>;
  private uRevealProgress: THREE.UniformNode<"float", number> = uniform(1);

  constructor() {
    super();

    this.resources = Experience.getInstance().resources;
    this.perlinTexture = this.resources.items
      .perlinTexture2 as THREE.Texture<HTMLImageElement>;
    this.perlinTexture.wrapS = THREE.RepeatWrapping;
    this.perlinTexture.wrapT = THREE.RepeatWrapping;

    // GEOMETRY
    this.geometry = new THREE.PlaneGeometry(1, 1, 64, 16);
    this.geometry.translate(0, 0.5, 0);
    this.geometry.scale(18, 4.5, 1);

    // MATERIAL
    const uvNode = uv();

    const uvDisplacement = vec2(
      texture(
        this.perlinTexture,
        vec2(
          uvNode.x.mul(0.5).add(time.mul(0.07)),
          uvNode.y.mul(0.5).add(time.mul(0.05)),
        ),
      )
        .r.sub(0.5)
        .mul(0.15),
      texture(
        this.perlinTexture,
        vec2(
          uvNode.x.mul(0.4).add(time.mul(0.04)),
          uvNode.y.mul(0.6).add(time.mul(0.06)),
        ),
      )
        .g.sub(0.5)
        .mul(0.1),
    );

    const displacedUv = vec2(
      uvNode.x.mul(0.3).add(time.mul(0.03)).add(uvDisplacement.x),
      uvNode.y.mul(0.5).add(uvDisplacement.y),
    );

    // const revealMask = this.uRevealProgress.smoothstep(
    //   this.uRevealProgress.sub(uvNode.x),
    //   this.uRevealProgress.sub(uvNode.x).sub(0.15),
    // );
    const invertedX = float(1).sub(uvNode.x);

    const revealMask = invertedX.smoothstep(
      this.uRevealProgress,
      this.uRevealProgress.add(0.1),
    );

    const borealStrength = texture(this.perlinTexture, displacedUv)
      .r.smoothstep(0.15, 1)
      .mul(uvNode.x.smoothstep(0.0, 0.2))
      .mul(uvNode.x.smoothstep(1.0, 0.8))
      .mul(uvNode.y.smoothstep(0.0, 0.4))
      .mul(uvNode.y.smoothstep(1.0, 0.4))
      .mul(revealMask);

    const vertexNoise = texture(
      this.perlinTexture,
      vec2(
        positionLocal.x.mul(0.05).add(time.mul(0.05)),
        positionLocal.z.mul(0.1).add(time.mul(0.03)),
      ),
    )
      .r.sub(0.5)
      .mul(0.8);

    this.material = new THREE.MeshBasicNodeMaterial({
      colorNode: vec4(
        color(COLORS.borealisColor).rgb.mul(10),
        borealStrength.mul(2),
      ),
      positionNode: positionLocal.add(vec3(0, vertexNoise, 0)),
      transparent: true,
    });

    this.position.set(0, 6, -17);
    this.rotation.x = Math.PI / 3;

    this.name = "Borealis";
  }

  public reveal() {
    gsap.to(this.uRevealProgress, {
      value: 0,
      duration: 3,
      ease: "power2.out",
    });
  }
}
