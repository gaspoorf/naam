import gsap from "gsap";
import {
  MSDFTextGeometry,
  MSDFTextNodeMaterial,
  type MSDFTextGeometryOptions,
} from "three-msdf-text-utils/webgpu";
import type { Font } from "three/examples/jsm/Addons.js";
import { color, uniform, vec4 } from "three/tsl";
import * as THREE from "three/webgpu";
import Experience from "../Experience";
import { boilingLines, perlinReveal } from "../tsl/textEffects";

export type TextAnchor =
  | "center"
  | "bottom-left"
  | "bottom-center"
  | "center-left";

export interface TextOptions extends Omit<
  MSDFTextGeometryOptions,
  "text" | "font"
> {
  fontName?: string;
  fontSize?: number;
  color?: string;
  anchor?: TextAnchor;
  offset?: { x?: number; y?: number };
}
export default class Text extends THREE.Mesh {
  declare material: MSDFTextNodeMaterial;
  declare geometry: MSDFTextGeometry;

  private resources = Experience.getInstance().resources;
  private camera = Experience.getInstance().sceneManager.uiScene.camera;
  private anchor: TextAnchor;
  private offset: { x: number; y: number };
  private finalScale!: number;

  private uniforms!: {
    uProgress: THREE.UniformNode<"float", number>;
  };

  constructor(content: string, options?: TextOptions) {
    super();

    this.anchor = options?.anchor ?? "center";
    this.offset = { x: options?.offset?.x ?? 0, y: options?.offset?.y ?? 0 };

    const fontResource =
      this.resources.items[`${options?.fontName}Font`] ??
      this.resources.items["stefanSimpleFont"];

    if (!fontResource) {
      console.warn("Font non trouvée dans les resources");
      return;
    }

    const atlas =
      (this.resources.items[`${options?.fontName}Atlas`] as THREE.Texture) ??
      (this.resources.items["stefanSimpleAtlas"] as THREE.Texture);

    const noiseTexture = this.resources.items[
      "perlinTexture"
    ] as THREE.Texture<HTMLImageElement>;

    const geometry = new MSDFTextGeometry({
      text: content,
      font: (fontResource as Font).data,
      align: "center",
      letterSpacing: -8,
      ...options,
    });

    this.uniforms = { uProgress: uniform(0) };

    const alpha = boilingLines(atlas, noiseTexture).mul(
      perlinReveal(this.uniforms.uProgress),
    );

    const material = new MSDFTextNodeMaterial({
      map: atlas,
      color: options?.color ?? "#ffffff",
      transparent: true,
    });

    material.colorNode = vec4(color(options?.color ?? "#ffffff"), alpha);

    this.geometry = geometry;
    this.material = material;
    this.rotation.x = Math.PI;

    this.finalScale = (options?.fontSize ?? 100) * 0.0001;
    this.scale.set(this.finalScale, this.finalScale, this.finalScale);

    this.repositionInViewport();
    this.animateIn();
  }

  public repositionInViewport() {
    const dist = Math.abs(this.camera.position.z);
    const vFov = (this.camera.fov * Math.PI) / 180;
    const visibleHeight = 2 * Math.tan(vFov / 2) * dist;
    const visibleWidth = visibleHeight * this.camera.aspect;
    const hw = visibleWidth / 2;
    const hh = visibleHeight / 2;

    const textWidth = this.geometry.layout.width * this.finalScale;
    const textHeight = this.geometry.layout.height * this.finalScale;

    const margin = 0.2;

    switch (this.anchor) {
      case "center":
        this.position.x = -textWidth / 2;
        this.position.y = -textHeight / 4;
        break;

      case "bottom-left":
        this.position.x = -hw + margin;
        this.position.y = -hh + textHeight + margin;
        break;

      case "bottom-center":
        this.position.x = -textWidth / 2;
        this.position.y = -hh + textHeight + margin;
        break;

      case "center-left":
        this.position.x = -hw + margin;
        this.position.y = -textHeight / 4;
        break;
    }

    this.position.x += this.offset.x;
    this.position.y += this.offset.y;
  }

  private animateIn() {
    gsap.killTweensOf(this.uniforms.uProgress);
    this.uniforms.uProgress.value = 0;
    gsap.to(this.uniforms.uProgress, {
      value: 1,
      duration: 4,
      ease: "power1.out",
    });
  }

  destroy() {
    gsap.killTweensOf(this.uniforms.uProgress);
    gsap.to(this.uniforms.uProgress, {
      value: 0,
      duration: 2,
      ease: "power1.out",
      onComplete: () => {
        this.geometry.dispose();
        this.material.dispose();
        this.parent?.remove(this);
      },
    });
  }
}
