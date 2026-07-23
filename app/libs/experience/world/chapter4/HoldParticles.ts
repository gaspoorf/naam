import {
  clamp,
  deltaTime,
  float,
  Fn,
  If,
  instancedArray,
  instanceIndex,
  length,
  mix,
  mx_noise_vec3,
  range,
  smoothstep,
  uniform,
  uv,
  vec3,
  vec4,
} from "three/tsl";
import * as THREE from "three/webgpu";
import { COLORS } from "~/constants";
import Experience from "../../Experience";
import { randValue } from "../../tsl/utils";

interface HoldParticlesOptions {
  from?: THREE.Vector3 | (() => THREE.Vector3);
  to?: THREE.Vector3 | (() => THREE.Vector3);
  minDuration?: number;
  maxDuration?: number;
  minDelay?: number;
  maxDelay?: number;
  noiseScale?: number;
  noiseFreq?: number;
  singleNoise?: boolean;
  baseDirection?: THREE.Vector3;
  baseDirectionBlend?: number;
}

export default class HoldParticles extends THREE.Sprite {
  override material: THREE.SpriteNodeMaterial;

  private renderer: THREE.WebGPURenderer;
  private time: Experience["time"];

  private uColor: THREE.UniformNode<"color", THREE.Color>;
  private uFrom: THREE.UniformNode<"vec3", THREE.Vector3>;
  private uTo: THREE.UniformNode<"vec3", THREE.Vector3>;
  private uDirection: THREE.UniformNode<"float", number>;
  private fromSource: THREE.Vector3 | (() => THREE.Vector3) | null = null;
  private toSource: THREE.Vector3 | (() => THREE.Vector3) | null = null;

  private computeInit: THREE.ComputeNode;
  private computeUpdate: THREE.ComputeNode;

  private totalDuration: number;
  private reverseStartTime = 0;
  private isReversing = false;

  public isDestroyed = false;

  constructor(scene: THREE.Scene, count = 200, options?: HoldParticlesOptions) {
    super();

    const { time, renderer } = Experience.getInstance();

    this.count = count;
    this.renderer = renderer.instance;
    this.time = time;

    this.uColor = uniform(new THREE.Color(COLORS.entityColor));

    const fromSource = options?.from;
    const fromValue: THREE.Vector3 =
      typeof fromSource === "function"
        ? fromSource().clone()
        : (fromSource?.clone() ?? new THREE.Vector3(-1, 0, 0));
    this.uFrom = uniform(fromValue.clone());

    const toSource = options?.to;
    const toValue: THREE.Vector3 =
      typeof toSource === "function"
        ? toSource().clone()
        : (toSource?.clone() ?? new THREE.Vector3(1, 0, 0));

    this.uTo = uniform(toValue.clone());
    this.uDirection = uniform(1);
    this.fromSource = fromSource ?? null;
    this.toSource = toSource ?? null;

    const minDuration = options?.minDuration ?? 1;
    const maxDuration = options?.maxDuration ?? 2;
    const minDelay = options?.minDelay ?? 0;
    const maxDelay = options?.maxDelay ?? 0.5;

    this.totalDuration = maxDelay * 1000 + maxDuration * 1000;

    const noiseScale = options?.noiseScale ?? 0.5;
    const noiseFreq = options?.noiseFreq ?? 0.8;
    const singleNoise = options?.singleNoise ?? false;

    const uNoiseScale = uniform(noiseScale);
    const uNoiseFreq = uniform(noiseFreq);

    const spawnPositionsBuffer = instancedArray(this.count, "vec3");
    const offsetPositionsBuffer = instancedArray(this.count, "vec3");
    const ageBuffer = instancedArray(this.count, "float");
    const lifetimeBuffer = instancedArray(this.count, "float");
    const delayBuffer = instancedArray(this.count, "float");
    const progressBuffer = instancedArray(this.count, "float");
    const seedBuffer = instancedArray(this.count, "float");

    const spawnPosition = spawnPositionsBuffer.element(instanceIndex);
    const offsetPosition = offsetPositionsBuffer.element(instanceIndex);
    const age = ageBuffer.element(instanceIndex);
    const lifetime = lifetimeBuffer.element(instanceIndex);
    const delay = delayBuffer.element(instanceIndex);
    const progress = progressBuffer.element(instanceIndex);
    const seed = seedBuffer.element(instanceIndex);

    this.computeInit = Fn(() => {
      spawnPosition.assign(
        vec3(
          randValue({ min: -0.05, max: 0.05, seed: 1 }),
          randValue({ min: -0.05, max: 0.05, seed: 2 }),
          randValue({ min: -0.05, max: 0.05, seed: 3 }),
        ),
      );

      lifetime.assign(
        randValue({ min: minDuration, max: maxDuration, seed: 13 }),
      );
      delay.assign(randValue({ min: minDelay, max: maxDelay, seed: 7 }));
      seed.assign(randValue({ min: 0, max: 100, seed: 42 }));

      age.assign(0);
      offsetPosition.assign(0);
      progress.assign(0);
    })().compute(this.count);

    const dir = toValue.clone().sub(fromValue).normalize();

    const worldUp =
      Math.abs(dir.y) < 0.99
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(0, 0, 1);

    const tangent = dir.clone();
    const binormal = new THREE.Vector3()
      .crossVectors(tangent, worldUp)
      .normalize();
    const normal = new THREE.Vector3()
      .crossVectors(tangent, binormal)
      .normalize();

    const uBinormal = uniform(binormal);
    const uNormal = uniform(normal);
    const direction = this.uTo.sub(this.uFrom);
    const uBaseDir = uniform(
      options?.baseDirection?.clone().normalize() ?? dir.clone(),
    );
    const blendEnd = options?.baseDirectionBlend ?? 0.4;

    this.computeUpdate = Fn(() => {
      age.addAssign(deltaTime);

      If(age.greaterThan(delay), () => {
        const rawProgress = clamp(
          progress.add(deltaTime.div(lifetime).mul(this.uDirection)),
          float(0),
          float(1),
        );
        progress.assign(rawProgress);

        const envelope = smoothstep(0.0, 0.2, rawProgress).mul(
          smoothstep(1.0, 0.8, rawProgress),
        );

        const noiseInput = vec3(
          singleNoise
            ? rawProgress.mul(uNoiseFreq)
            : rawProgress.mul(uNoiseFreq).add(seed),
          singleNoise ? 0 : seed.mul(0.1),
          singleNoise ? 0 : seed.mul(0.3),
        );

        const noiseVal = mx_noise_vec3(noiseInput);
        const perpOffset = uBinormal
          .mul(noiseVal.x)
          .add(uNormal.mul(noiseVal.y))
          .mul(uNoiseScale)
          .mul(envelope);

        const blendT = smoothstep(0.0, blendEnd, rawProgress);
        const effectiveDir = mix(uBaseDir, direction.normalize(), blendT);
        const travelDist = length(direction).mul(rawProgress);
        const blendedOffset = effectiveDir.mul(travelDist);

        offsetPosition.assign(blendedOffset.add(perpOffset));
      });
    })().compute(this.count);

    this.renderer.computeAsync(this.computeInit);

    const dist = length(uv().sub(0.5));
    const circle = smoothstep(0.5, 0.49, dist);
    const fadeIn = smoothstep(0.0, 0.1, progress);
    const fadeOut = smoothstep(1.0, 0.9, progress);
    const scaleFactor = fadeIn.mul(fadeOut);
    const baseScale = vec3(range(0.004, 0.04));
    const animatedScale = baseScale.mul(scaleFactor);
    const finalColor = vec4(this.uColor.mul(5), circle);

    this.material = new THREE.SpriteNodeMaterial({
      blending: THREE.AdditiveBlending,
      positionNode: this.uFrom.add(spawnPosition).add(offsetPosition),
      colorNode: finalColor,
      alphaTestNode: float(0.95),
      scaleNode: animatedScale,
      fog: false,
    });

    scene.add(this);
  }

  reverse() {
    if (this.isDestroyed || this.isReversing) return;

    if (typeof this.fromSource === "function") {
      this.uFrom.value.copy(this.fromSource());
      this.fromSource = this.uFrom.value.clone();
    }

    if (typeof this.toSource === "function") {
      this.uTo.value.copy(this.toSource());
      this.toSource = this.uTo.value.clone();
    }

    this.uDirection.value = -1;
    this.isReversing = true;
    this.reverseStartTime = this.time.current;
  }

  update() {
    if (this.isDestroyed) return;

    if (!this.isReversing && typeof this.fromSource === "function") {
      this.uFrom.value.copy(this.fromSource());
    }

    if (!this.isReversing && typeof this.toSource === "function") {
      this.uTo.value.copy(this.toSource());
    }

    if (
      this.isReversing &&
      this.time.current - this.reverseStartTime >= this.totalDuration
    ) {
      this.destroy();
      return;
    }

    this.frustumCulled = false;
    this.renderer.compute(this.computeUpdate);
  }

  destroy() {
    if (this.isDestroyed) return;

    this.computeInit.dispose();
    this.computeUpdate.dispose();
    this.material.dispose();
    this.parent?.remove(this);
    this.isDestroyed = true;
  }
}
