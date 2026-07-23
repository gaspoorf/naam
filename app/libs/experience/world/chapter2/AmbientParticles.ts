import {
  color,
  float,
  Fn,
  instancedArray,
  instanceIndex,
  length,
  mix,
  mx_noise_vec3,
  range,
  smoothstep,
  time,
  uniform,
  uv,
  vec3,
  vec4,
} from "three/tsl";
import * as THREE from "three/webgpu";
import { COLORS } from "~/constants";
import Experience from "../../Experience";

export default class AmbientParticles extends THREE.Sprite {
  private renderer: THREE.WebGPURenderer;
  private computeInit: THREE.ComputeNode;
  private computeUpdate: THREE.ComputeNode;

  public uIntensity = uniform(float(0));
  public uTargetPos = uniform(vec3(3.8, 3, -9));

  constructor(scene: THREE.Scene, count = 1000) {
    super();
    const { renderer } = Experience.getInstance();
    this.count = count;
    this.renderer = renderer.instance;

    const positionBuffer = instancedArray(this.count, "vec3");
    const seedBuffer = instancedArray(this.count, "float");
    const phaseBuffer = instancedArray(this.count, "float");
    const restPosBuffer = instancedArray(this.count, "vec3");
    const attractedBuffer = instancedArray(this.count, "float");

    const pos = positionBuffer.element(instanceIndex);
    const seed = seedBuffer.element(instanceIndex);
    const phase = phaseBuffer.element(instanceIndex);
    const restPos = restPosBuffer.element(instanceIndex);
    const attracted = attractedBuffer.element(instanceIndex);

    this.computeInit = Fn(() => {
      seed.assign(range(0, 100));
      phase.assign(range(0, 1));
      const initPos = vec3(range(-15, 15), range(0, 15), range(-40, 10));
      pos.assign(initPos);
      restPos.assign(initPos);
      attracted.assign(float(0));
    })().compute(this.count);

    this.computeUpdate = Fn(() => {
      const noiseInput = pos.mul(0.2).add(time.mul(0.1)).add(seed);
      const noiseVel = mx_noise_vec3(noiseInput).mul(0.02);

      const phaseThreshold = float(1).sub(phase);
      const localIntensity = smoothstep(
        phaseThreshold,
        phaseThreshold.add(0.3),
        this.uIntensity,
      );

      const dirToTarget = this.uTargetPos.sub(pos);
      const dist = length(dirToTarget);
      const attractionForce = dirToTarget.normalize().mul(dist.mul(0.05));

      const toRest = restPos.sub(pos);
      const restForce = toRest.mul(0.03);

      const isAttracted = attracted.greaterThan(0.5);

      const activeVel = mix(noiseVel, attractionForce, localIntensity);
      const finalVel = isAttracted.select(
        activeVel,
        restForce.add(noiseVel.mul(0.3)),
      );

      pos.addAssign(finalVel);

      const shouldAttract = this.uIntensity.greaterThan(
        phaseThreshold.add(0.05),
      );
      attracted.assign(shouldAttract.select(float(1), attracted));

      const arrivedAtRock = isAttracted.and(dist.lessThan(0.5));
      const newRestPos = vec3(range(-15, 15), range(0, 15), range(-40, 10));
      pos.assign(arrivedAtRock.select(newRestPos, pos));
      restPos.assign(arrivedAtRock.select(newRestPos, restPos));
      attracted.assign(arrivedAtRock.select(float(0), attracted));

      const shouldRelease = this.uIntensity.lessThan(0.05).and(isAttracted);
      attracted.assign(shouldRelease.select(float(0), attracted));
      phase.assign(shouldRelease.select(range(0, 1), phase));
    })().compute(this.count);

    this.renderer.computeAsync(this.computeInit);

    const distFromCenter = length(uv().sub(0.5));
    const circle = smoothstep(0.2, 0.1, distFromCenter);
    const finalColor = vec4(
      color(COLORS.entityColor).mul(mix(2.0, 10.0, this.uIntensity)),
      circle,
    );

    this.material = new THREE.SpriteNodeMaterial({
      blending: THREE.AdditiveBlending,
      positionNode: pos,
      colorNode: finalColor,
      scaleNode: range(0.02, 0.08),
      alphaTestNode: float(0.9),
    });

    scene.add(this);
  }

  update() {
    this.renderer.compute(this.computeUpdate);
  }
}
