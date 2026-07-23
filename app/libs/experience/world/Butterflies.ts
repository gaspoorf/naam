import {
  abs,
  deltaTime,
  float,
  Fn,
  instancedArray,
  instanceIndex,
  mx_noise_float,
  mx_noise_vec3,
  sin,
  texture,
  time,
  uniform,
  uv,
  vec3,
} from "three/tsl";
import * as THREE from "three/webgpu";
import Experience from "../Experience";
import { randValue } from "../tsl/utils";

interface ButterfliesOptions {
  count?: number;
  /** Centre de la zone de spawn et d'attraction. */
  origin?: THREE.Vector3;
  /** Demi-côté de la zone de vagabondage XZ (carré de wanderSize*2 × wanderSize*2) */
  wanderSize?: number;
  /** Borne Y basse (les papillons restent au-dessus) */
  yMin?: number;
  /** Borne Y haute (les papillons restent en-dessous) */
  yMax?: number;
  /** Vitesse globale de déplacement */
  speed?: number;
  /** Fréquence basse du bruit (dérive lente) */
  driftFreq?: number;
  /** Fréquence haute du bruit (battements rapides) */
  flapFreq?: number;
  /** Amplitude verticale des battements */
  flapAmplitude?: number;
  color?: THREE.Color;
}

export default class Butterflies extends THREE.Sprite {
  override material: THREE.SpriteNodeMaterial;

  private renderer: THREE.WebGPURenderer;

  private uColor: THREE.UniformNode<"color", THREE.Color>;
  private uOrigin: THREE.UniformNode<"vec3", THREE.Vector3>;
  private uTexture: THREE.UniformNode<"vec4", THREE.Texture>;

  private computeInit: THREE.ComputeNode;
  private computeUpdate: THREE.ComputeNode;

  constructor(scene: THREE.Scene, options?: ButterfliesOptions) {
    super();

    const experience = Experience.getInstance();
    const count = options?.count ?? 60;
    this.count = count;

    this.renderer = experience.renderer.instance;

    // ── Uniforms ──────────────────────────────────────────────────────────────
    this.uColor = uniform(options?.color?.clone() ?? new THREE.Color(0xffffff));
    this.uOrigin = uniform(
      options?.origin?.clone() ?? new THREE.Vector3(0, 0, 0),
    );
    const butterflyTexture = experience.resources.items[
      "butterfly"
    ] as THREE.Texture;
    // this.uTexture = uniform(texture(experience.resources.items.butterfly));
    this.uTexture = uniform(texture(butterflyTexture));

    const uWanderSize = uniform(options?.wanderSize ?? 50); // demi-côté → zone 100×100
    const uYMin = uniform(options?.yMin ?? 0);
    const uYMax = uniform(options?.yMax ?? 1.0);
    const uSpeed = uniform(options?.speed ?? 0.8);
    const uDriftFreq = uniform(options?.driftFreq ?? 0.25);
    const uFlapFreq = uniform(options?.flapFreq ?? 3.0);
    const uFlapAmplitude = uniform(options?.flapAmplitude ?? 0.12);

    // ── Buffers ───────────────────────────────────────────────────────────────
    const positionsBuffer = instancedArray(count, "vec3");
    const seedBuffer = instancedArray(count, "vec3");
    const timeOffsetBuffer = instancedArray(count, "float");

    const position = positionsBuffer.element(instanceIndex);
    const seed = seedBuffer.element(instanceIndex);
    const timeOffset = timeOffsetBuffer.element(instanceIndex);

    // ── Init compute ──────────────────────────────────────────────────────────
    this.computeInit = Fn(() => {
      // Spawn réparti sur toute la zone XZ dès le départ
      const offsetX = randValue({ min: -1, max: 1, seed: 1 }).mul(uWanderSize);
      const offsetY = randValue({ min: 0, max: 1, seed: 2 })
        .mul(uYMax.sub(uYMin))
        .add(uYMin);
      const offsetZ = randValue({ min: -1, max: 1, seed: 3 }).mul(uWanderSize);

      position.assign(this.uOrigin.add(vec3(offsetX, offsetY, offsetZ)));

      seed.assign(
        vec3(
          randValue({ min: 0, max: 100, seed: 11 }),
          randValue({ min: 0, max: 100, seed: 22 }),
          randValue({ min: 0, max: 100, seed: 33 }),
        ),
      );

      timeOffset.assign(randValue({ min: 0, max: 1000, seed: 7 }));
    })().compute(count);

    // ── Update compute ────────────────────────────────────────────────────────
    this.computeUpdate = Fn(() => {
      // 1. Dérive lente XYZ
      const driftInput = vec3(time.mul(uDriftFreq).add(seed.x), seed.y, seed.z);
      const drift = mx_noise_vec3(driftInput);

      // 2. Battement vertical haute fréquence
      const flapInput = time.mul(uFlapFreq).add(seed.x.mul(0.5));
      const flap = mx_noise_float(flapInput);

      const velocity = vec3(
        drift.x,
        drift.y.mul(0.3).add(flap.mul(uFlapAmplitude)),
        drift.z,
      )
        .mul(uSpeed)
        .mul(deltaTime);

      const nextPos = position.add(velocity);

      // ── Contrainte XZ : rappel doux vers la zone carrée ──────────────────
      const originX = this.uOrigin.x;
      const originZ = this.uOrigin.z;

      // Distance de dépassement sur chaque axe (0 si dans la zone)
      const overX = nextPos.x.sub(originX).abs().sub(uWanderSize).max(0.0);
      const overZ = nextPos.z.sub(originZ).abs().sub(uWanderSize).max(0.0);

      // Signe du dépassement → direction du rappel
      const signX = nextPos.x.sub(originX).sign().negate();
      const signZ = nextPos.z.sub(originZ).sign().negate();

      const pullXZ = vec3(
        signX.mul(overX.mul(overX).mul(2.0)),
        0,
        signZ.mul(overZ.mul(overZ).mul(2.0)),
      ).mul(deltaTime);

      // ── Contrainte Y : rappel soft vers [yMin, yMax] ──────────────────────
      // En-dessous de yMin → rappel vers le haut
      const underY = uYMin.sub(nextPos.y).max(0.0);
      // Au-dessus de yMax → rappel vers le bas
      const aboveY = nextPos.y.sub(uYMax).max(0.0);

      const pullY = underY
        .mul(underY)
        .mul(4.0)
        .sub(aboveY.mul(aboveY).mul(4.0));

      const pull = vec3(pullXZ.x, pullY, pullXZ.z).mul(deltaTime);

      position.assign(nextPos.add(pull));
    })().compute(count);

    this.renderer.computeAsync(this.computeInit);

    // ── Visuel ────────────────────────────────────────────────────────────────
    // const finalColor = vec4(this.uColor, 1.0); disc
    const finalColor = texture(this.uTexture.value, uv());

    this.material = new THREE.SpriteNodeMaterial({
      transparent: false,
      // depthWrite: true,
      blending: THREE.NormalBlending,
      positionNode: positionsBuffer.element(instanceIndex),
      alphaTestNode: float(0.8),
      colorNode: finalColor,
      scaleNode: vec3(abs(sin(time.mul(8).add(timeOffset))).mul(0.1), 0.1, 1.0),
    });

    // this.renderOrder = 3;
    this.frustumCulled = false;

    scene.add(this);
  }

  update() {
    this.renderer.compute(this.computeUpdate);
  }

  setOrigin(target: THREE.Vector3) {
    this.uOrigin.value.copy(target);
  }

  destroy() {
    this.computeInit.dispose();
    this.computeUpdate.dispose();
    this.material.dispose();
    this.parent?.remove(this);
  }
}
