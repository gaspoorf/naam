import gsap from "gsap";
import {
  color,
  float,
  positionGeometry,
  texture,
  uniform,
  uv,
  vec2,
  vec4,
} from "three/tsl";
import * as THREE from "three/webgpu";
import { COLORS } from "~/constants";
import Experience from "../../Experience";
import { perlinRevealFromCenter } from "../../tsl/textEffects";
import { coverUv } from "../../tsl/utils";
import type Sizes from "../../utils/Sizes";
import type Time from "../../utils/Time";

interface IntroSketchOptions {
  delay?: number;
  revealDuration?: number;
  holdDuration?: number;
  hideDuration?: number;
}

export default class IntroSketch extends THREE.Mesh {
  private sizes: Sizes;
  private time: Time;
  private scene: THREE.Scene;

  public override material: THREE.MeshBasicNodeMaterial;
  public override geometry: THREE.PlaneGeometry;

  private uRevealProgress: THREE.UniformNode<"float", number> = uniform(0);
  private uImageSizes: THREE.UniformNode<"vec2", THREE.Vector2>;
  private uPlaneSizes: THREE.UniformNode<"vec2", THREE.Vector2>;
  private uZoom: THREE.UniformNode<"float", number> = uniform(1);
  private options: IntroSketchOptions;
  private timeline?: gsap.core.Timeline;
  private hasAppeared = false;

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    image: THREE.Texture<HTMLImageElement>,
    options?: IntroSketchOptions,
  ) {
    super();

    this.sizes = Experience.getInstance().sizes;
    this.time = Experience.getInstance().time;
    this.scene = scene;
    this.options = options ?? {};

    this.geometry = new THREE.PlaneGeometry(2, 2, 1, 1);

    this.uImageSizes = uniform(vec2(image.image.width, image.image.height));
    this.uPlaneSizes = uniform(vec2(this.sizes.width, this.sizes.height));

    const uvNode = uv();
    const coveredUv = coverUv({
      uv: uvNode,
      planeSize: this.uPlaneSizes,
      imageSize: this.uImageSizes,
    });
    const zoom = this.uZoom;
    const remappedUv = coveredUv.sub(0.5).mul(zoom).add(0.5);

    this.material = new THREE.MeshBasicNodeMaterial({
      colorNode: vec4(
        texture(image, remappedUv).mul(color(COLORS.sketchColor)).rgb,
        texture(image, remappedUv).a.mul(
          perlinRevealFromCenter(this.uRevealProgress),
        ),
      ),
      alphaTestNode: float(0.1),
      vertexNode: vec4(positionGeometry, 1),
      transparent: true,
    });

    this.position.copy(position);

    this.scene.add(this);

    this.play();
  }

  public resize() {
    this.uPlaneSizes.value.set(this.sizes.width, this.sizes.height);
  }

  private play() {
    const delay = this.options.delay ?? 0;
    const revealDuration = this.options.revealDuration ?? 5;
    const holdDuration = this.options.holdDuration ?? 2;
    const hideDuration = this.options.hideDuration ?? 3;

    this.uRevealProgress.value = 0;

    this.timeline = gsap.timeline({
      delay,
    });

    this.timeline
      .to(this.uRevealProgress, {
        value: 1,
        duration: revealDuration,
        ease: "power1.out",
        onStart: () => {
          this.hasAppeared = true;
        },
      })
      .to(this.uRevealProgress, {
        value: 1,
        duration: holdDuration,
      })
      .to(this.uRevealProgress, {
        value: 0,
        duration: hideDuration,
        ease: "power2.in",
        onComplete: () => {
          this.timeline?.kill();

          gsap.killTweensOf(this.uRevealProgress);

          this.scene.remove(this);
          this.geometry.dispose();
          this.material.dispose();
        },
      });
  }

  public update() {
    if (!this.hasAppeared) return;
    this.uZoom.value -= this.time.delta * 0.00001;
  }
}
