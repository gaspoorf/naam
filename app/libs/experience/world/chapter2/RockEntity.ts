import gsap from "gsap";
import {
  color,
  float,
  hash,
  mix,
  smoothstep,
  texture,
  uniform,
  uv,
  vec4,
} from "three/tsl";
import * as THREE from "three/webgpu";
import { COLORS } from "~/constants";
import Experience from "../../Experience";
import type Controls from "../../utils/Controls";
import type Raycaster from "../../utils/Raycaster";

export default class RockEntity {
  private rockBody: THREE.Mesh | null = null;
  private rockNerv: THREE.Mesh | null = null;
  private rockEyes: THREE.Mesh | null = null;

  private nervOpacity = uniform(float(0));
  private eyesOpacity = uniform(float(0));
  private eyesHoverBloom = uniform(float(0));
  private rockCompleted = false;
  private isHovered = false;

  private currentHoldProgress: number = 0;
  private isBeingHeld: boolean = false;

  private experience: Experience;
  private controls: Controls;
  private raycaster: Raycaster;

  private _onHoldChange: ((isHeld: boolean) => void) | null = null;
  private _onHoldProgress: ((progress01: number) => void) | null = null;
  private _onComplete: (() => void) | null = null;

  constructor(
    raycaster: Raycaster,
    model: THREE.Object3D,
    onHoldChange?: (isHeld: boolean) => void,
    onHoldProgress?: (progress01: number) => void,
    onComplete?: () => void,
  ) {
    this.experience = Experience.getInstance();
    this.controls = this.experience.controls;
    this.raycaster = raycaster;
    this._onHoldChange = onHoldChange ?? null;
    this._onHoldProgress = onHoldProgress ?? null;
    this._onComplete = onComplete ?? null;

    this.collectMeshes(model);
    this.setupMaterials();
    this.setupHold();
  }

  private collectMeshes(model: THREE.Object3D) {
    model.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      if (obj.name.includes("entity-body")) this.rockBody = obj as THREE.Mesh;
      if (obj.name.includes("entity-nerv")) this.rockNerv = obj as THREE.Mesh;
      if (obj.name.includes("entity-eyes")) this.rockEyes = obj as THREE.Mesh;
    });
  }

  private setupMaterials() {
    if (this.rockNerv) {
      const baseMat = this.rockNerv.material as THREE.MeshStandardNodeMaterial;

      const mat = baseMat.clone();
      mat.color = new THREE.Color(0xffffff);
      mat.alphaTestNode = float(0.5);
      mat.emissiveIntensity = 0;
      mat.emissiveNode = null;

      const baseColor = color(0xffffff);
      const glowColor = color(COLORS.entityColor);

      const variation = hash(uv().x.mul(10.0)).mul(0.4);
      const staggeredUV = uv().y.oneMinus().add(variation);
      const totalProgress = this.nervOpacity.mul(1.4);

      const isVisible = staggeredUV.lessThan(totalProgress);
      const opacityMask = isVisible.select(float(1.0), float(0.0));

      const edge = smoothstep(
        totalProgress.sub(0.1),
        totalProgress,
        staggeredUV,
      ).mul(opacityMask);

      const baseTexture = mat.map;

      const emissiveCalcul = mix(
        baseColor,
        glowColor.mul(20),
        edge.add(this.nervOpacity.mul(0.3)),
      );

      mat.colorNode = baseTexture
        ? vec4(
            color(COLORS.entityColor).mul(20).mul(emissiveCalcul),
            opacityMask.mul(texture(baseTexture).a),
          )
        : vec4(1, 1, 1, 1);

      this.rockNerv.material = mat;
    }
    if (this.rockEyes) {
      const baseMat = this.rockEyes.material as THREE.MeshStandardNodeMaterial;
      const material = baseMat.clone() as THREE.MeshStandardNodeMaterial;
      const baseTexture = baseMat.map;

      material.emissiveIntensity = 0;
      material.emissiveNode = null;
      material.color = new THREE.Color(0xffffff);
      material.colorNode = baseTexture
        ? vec4(
            color(COLORS.entityColor).mul(
              float(10).add(float(20).mul(this.eyesOpacity)).add(float(15).mul(this.eyesHoverBloom)),
            ),
            texture(baseTexture).a,
          )
        : vec4(1, 0, 0, 1);
      material.alphaTestNode = float(0.9);
      this.rockEyes.material = material;
    }
  }

  private setupHold() {
    if (!this.rockBody || !this.rockNerv) return;

    this.experience.controls.on("hold", (progress: number) => {
      if (this.rockCompleted) return;

      this.raycaster.update();
      const intersects = this.raycaster.intersectObject(this.rockBody!);

      if (intersects.length > 0 && progress > 0) {
        if (!this.isBeingHeld) this._onHoldChange?.(true);

        this.isBeingHeld = true;

        const progress01 = THREE.MathUtils.clamp(progress / 200, 0, 1);
        this.currentHoldProgress = progress01;

        this._onHoldProgress?.(progress01);

        if (progress01 >= 1) {
          this.onComplete();
        }
      } else {
        if (this.isBeingHeld) this._onHoldChange?.(false);

        this.isBeingHeld = false;
        this.currentHoldProgress = 0;

        this._onHoldProgress?.(0);
      }
    });
  }

  private onComplete() {
    this.rockCompleted = true;
    console.log("rock hold completed");
    this._onComplete?.();
  }

  public setRevealIntensity(value: number) {
    const v = THREE.MathUtils.clamp(value, 0, 1);

    (this.nervOpacity as any).value = v;
    (this.eyesOpacity as any).value = v;
  }

  update() {
    this.raycaster.update();

    if (this.rockBody) {
      const intersects = this.raycaster.intersectObject(this.rockBody);

      const hovering = intersects.length > 0 && !this.rockCompleted;

      if (hovering !== this.isHovered) {
        this.isHovered = hovering;
        gsap.to(this.eyesHoverBloom, {
          value: hovering ? 1 : 0,
          duration: 0.4,
          ease: "power2.out",
        });
      }

      if (hovering) {
        this.experience.controls.setCursor("hover");
      } else {
        this.experience.controls.setCursor("base");
      }
    }
  }

  destroy() {}
}
