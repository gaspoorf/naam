import {
  deltaTime,
  float,
  Fn,
  If,
  instancedArray,
  instanceIndex,
  length,
  min,
  mix,
  mrt,
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
import Experience from "../Experience";
import { randValue } from "../tsl/utils";

interface ParticlesOptions {
  from?: THREE.Vector3;
  // to?: THREE.Vector3;
  to?: THREE.Vector3 | (() => THREE.Vector3);
  minDuration?: number;
  maxDuration?: number;
  minDelay?: number;
  maxDelay?: number;
  noiseScale?: number;
  noiseFreq?: number;
  singleNoise?: boolean;
  baseDirection?: THREE.Vector3; // direction initiale (ex: new Vector3(0,1,0) pour monter vers le ciel)
  baseDirectionBlend?: number;
}

export default class Particles extends THREE.Sprite {
  override material: THREE.SpriteNodeMaterial;

  private renderer: THREE.WebGPURenderer;
  private time: Experience["time"];

  private uColor: THREE.UniformNode<"color", THREE.Color>;
  private uFrom: THREE.UniformNode<"vec3", THREE.Vector3>;
  private uTo: THREE.UniformNode<"vec3", THREE.Vector3>;
  private toSource: THREE.Vector3 | (() => THREE.Vector3) | null = null;

  private computeInit: THREE.ComputeNode;
  private computeUpdate: THREE.ComputeNode;

  private totalDuration: number;
  private startTime: number;

  public isDestroyed = false;

  constructor(scene: THREE.Scene, count = 200, options?: ParticlesOptions) {
    super();

    const { time, renderer } = Experience.getInstance();

    this.count = count;
    this.renderer = renderer.instance;
    this.time = time;

    this.uColor = uniform(new THREE.Color(COLORS.entityColor));
    this.uFrom = uniform(options?.from?.clone() ?? new THREE.Vector3(-1, 0, 0));
    // this.uTo = uniform(options?.to?.clone() ?? new THREE.Vector3(1, 0, 0));
    const toValue =
      typeof options?.to === "function"
        ? options.to()
        : (options?.to?.clone() ?? new THREE.Vector3(1, 0, 0));

    this.uTo = uniform(toValue.clone());

    // Stocker la source pour le update
    this.toSource = options?.to ?? null;

    // OPTIONS
    const minDuration = options?.minDuration ?? 1;
    const maxDuration = options?.maxDuration ?? 2;
    const minDelay = options?.minDelay ?? 0;
    const maxDelay = options?.maxDelay ?? 0.5;

    this.totalDuration = maxDelay * 1000 + maxDuration * 1000;
    this.startTime = this.time.current;

    const noiseScale = options?.noiseScale ?? 0.5;
    const noiseFreq = options?.noiseFreq ?? 0.8;
    const singleNoise = options?.singleNoise ?? false;

    const uNoiseScale = uniform(noiseScale);
    const uNoiseFreq = uniform(noiseFreq);

    // BUFFERS
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
        this.uFrom.add(
          vec3(
            randValue({ min: -0.05, max: 0.05, seed: 1 }),
            randValue({ min: -0.05, max: 0.05, seed: 2 }),
            randValue({ min: -0.05, max: 0.05, seed: 3 }),
          ),
        ),
      );

      lifetime.assign(
        randValue({ min: minDuration, max: maxDuration, seed: 13 }),
      );
      delay.assign(randValue({ min: minDelay, max: maxDelay, seed: 7 }));
      seed.assign(randValue({ min: 0, max: 100, seed: 42 })); // offset unique par particule

      age.assign(0);
      offsetPosition.assign(0);
      progress.assign(0);
    })().compute(this.count);

    // Direction et base orthonormée (calculées en JS, passées en uniforms)
    // const dir =
    //   options?.to
    //     ?.clone()
    //     .sub(options?.from ?? new THREE.Vector3(-1, 0, 0))
    //     .normalize() ?? new THREE.Vector3(1, 0, 0);

    //   const toValue =
    // typeof options?.to === "function"
    //   ? options.to()
    //   : options?.to?.clone() ?? new THREE.Vector3(1, 0, 0);

    const dir = toValue
      .clone()
      .sub(options?.from ?? new THREE.Vector3(-1, 0, 0))
      .normalize();

    // Vecteur "up" de référence — on évite la dégénérescence si dir ≈ up
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

    const uTangent = uniform(tangent);
    const uBinormal = uniform(binormal);
    const uNormal = uniform(normal);

    const direction = this.uTo.sub(this.uFrom);

    const uBaseDir = uniform(
      options?.baseDirection?.clone().normalize() ?? dir.clone(),
    );
    const blendEnd = options?.baseDirectionBlend ?? 0.4;

    this.computeUpdate = Fn(() => {
      const totalDuration = delay.add(lifetime);

      If(age.lessThan(totalDuration), () => {
        age.addAssign(deltaTime);

        const activeAge = age.sub(delay);

        If(activeAge.greaterThan(0), () => {
          const rawProgress = min(activeAge.div(lifetime), 1.0);
          progress.assign(rawProgress);

          // Enveloppe : 0 au début et à la fin, max au milieu
          const envelope = smoothstep(0.0, 0.2, rawProgress).mul(
            smoothstep(1.0, 0.8, rawProgress),
          );

          // Entrée du bruit : progress le long du chemin + décalage par seed
          // Chaque particule a sa propre "ligne" dans l'espace du bruit
          const noiseInput = vec3(
            singleNoise
              ? rawProgress.mul(uNoiseFreq)
              : rawProgress.mul(uNoiseFreq).add(seed),
            singleNoise ? 0 : seed.mul(0.1),
            singleNoise ? 0 : seed.mul(0.3),
          );

          const noiseVal = mx_noise_vec3(noiseInput);

          // On projette le bruit sur les deux axes perpendiculaires au chemin
          const perpOffset = uBinormal
            .mul(noiseVal.x)
            .add(uNormal.mul(noiseVal.y))
            .mul(uNoiseScale)
            .mul(envelope);

          // Position finale = interpolation linéaire + offset perpendiculaire
          // offsetPosition.assign(direction.mul(rawProgress).add(perpOffset));

          const blendT = smoothstep(0.0, blendEnd, rawProgress);
          const effectiveDir = mix(uBaseDir, direction.normalize(), blendT);

          // On reconstitue le déplacement : magnitude réelle + direction blendée
          const travelDist = length(direction).mul(rawProgress);
          const blendedOffset = effectiveDir.mul(travelDist);

          // Position finale = déplacement blendé + bruit perpendiculaire
          offsetPosition.assign(blendedOffset.add(perpOffset));
        });
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
      positionNode: spawnPosition.add(offsetPosition),
      colorNode: finalColor,
      mrtNode: mrt({ bloomIntensity: finalColor.r.mul(0.3) }),
      alphaTestNode: float(0.95),
      scaleNode: animatedScale,
    });

    scene.add(this);
  }

  update() {
    const elapsed = this.time.current - this.startTime;

    if (elapsed >= this.totalDuration) {
      this.destroy();
      return;
    }

    if (typeof this.toSource === "function") {
      this.uTo.value.copy(this.toSource());
    }

    this.frustumCulled = false;

    this.renderer.compute(this.computeUpdate);
  }

  destroy() {
    this.computeInit.dispose();
    this.computeUpdate.dispose();
    this.material.dispose();
    this.parent?.remove(this);
    this.isDestroyed = true;
  }
}
