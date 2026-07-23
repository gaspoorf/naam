import gsap from "gsap";
import * as THREE from "three/webgpu";
import type Controls from "../../utils/Controls";
import type Time from "../../utils/Time";
import Player from "../Player";

const HOLD_TRAVEL_SECONDS = 3.5;
const HOLD_PROGRESS_MAX = HOLD_TRAVEL_SECONDS * 100;
const HOLD_LIFT_MAX = 2;
const RELEASE_IDLE_FADE_SECONDS = 0.3;
const HOLD_TO_FLOAT_BLEND_SECONDS = 0.25;

export type HoldAnimState = {
  progress: number;
  wobble: number;
};

type S4AnimationOptions = {
  time: Time;
  controls: Controls;
  player: Player;
  onComplete?: () => void;
  onRelease?: () => void;
  onBegin?: () => void;
};

export default class S4Animation {
  private time: Time;
  private controls: Controls;
  private player: Player;

  private onComplete?: () => void;
  private onRelease?: () => void;
  private onBegin?: () => void;

  private isHover = false;
  private isPointerDown = false;
  public isHolding = false;
  public isHoldComplete = false;
  private isPlayerAnimFrozen = true;

  private holdProgressTarget = 0;
  private holdTimeline: gsap.core.Timeline | null = null;
  private idleFreezeDelay: gsap.core.Tween | null = null;

  private holdCompleteTime = 0;
  private holdCompleteStartY = 0;
  private holdCompleteStartRotX = 0;
  private holdCompleteStartRotY = 0;
  private holdCompleteStartRotZ = 0;

  public holdAnim: HoldAnimState = {
    progress: 0,
    wobble: 0,
  };

  constructor(options: S4AnimationOptions) {
    this.time = options.time;
    this.controls = options.controls;
    this.player = options.player;

    this.onComplete = options.onComplete;
    this.onRelease = options.onRelease;
    this.onBegin = options.onBegin;

    this.controls.on("hold", this.handleHold);
    this.controls.on("mousedown", this.onPointerDown);
    this.controls.on("mouseup", this.onPointerUp);
  }

  public setHover(value: boolean) {
    this.isHover = value;

    if (!this.isHover && this.isHolding) {
      this.releaseHold();
    }
  }

  public get progress() {
    return this.holdAnim.progress;
  }

  public get isComplete() {
    return this.isHoldComplete;
  }

  public get holding() {
    return this.isHolding;
  }

  public get shouldUpdatePlayerAnimator() {
    return !this.isPlayerAnimFrozen;
  }

  private handleHold = (progress: number) => {
    if (this.isHoldComplete) return;
    if (!this.isHover) return;
    if (!this.isPointerDown) return;

    this.holdProgressTarget = THREE.MathUtils.clamp(
      progress / HOLD_PROGRESS_MAX,
      0,
      1,
    );

    if (!this.isHolding) {
      this.beginHold();
    }

    if (this.holdProgressTarget >= 1) {
      this.completeHold();
      return;
    }

    this.playHoldTimeline(this.holdProgressTarget, 1, 0.12);
  };

  private onPointerDown = () => {
    this.isPointerDown = true;

    if (this.isHover && !this.isHoldComplete) {
      this.beginHold();
    }
  };

  private onPointerUp = () => {
    this.isPointerDown = false;

    if (this.isHolding) {
      this.releaseHold();
    }
  };

  private playHoldTimeline(
    targetProgress: number,
    targetWobble: number,
    duration: number,
  ) {
    this.holdTimeline?.kill();

    this.holdTimeline = gsap.timeline();

    this.holdTimeline.to(this.holdAnim, {
      progress: targetProgress,
      wobble: targetWobble,
      duration,
      ease: "power2.out",
    });
  }

  private beginHold() {
    if (this.isHolding || this.isHoldComplete) return;

    this.isHolding = true;
    this.isPlayerAnimFrozen = false;

    this.idleFreezeDelay?.kill();

    this.player.animator.playElevate();
    this.playHoldTimeline(this.holdProgressTarget, 1, 0.25);

    this.onBegin?.();
  }

  private releaseHold() {
    if (this.isHoldComplete) return;

    this.isHolding = false;
    this.holdProgressTarget = 0;

    this.player.animator.playIdle(RELEASE_IDLE_FADE_SECONDS);
    this.isPlayerAnimFrozen = false;

    this.playHoldTimeline(0, 0, 1.4);

    this.idleFreezeDelay?.kill();
    this.idleFreezeDelay = gsap.delayedCall(RELEASE_IDLE_FADE_SECONDS, () => {
      if (!this.isHolding) {
        this.isPlayerAnimFrozen = true;
      }
    });

    this.onRelease?.();
  }

  private completeHold() {
    if (this.isHoldComplete) return;

    this.holdTimeline?.kill();

    this.holdCompleteStartY = this.player.position.y;
    this.holdCompleteStartRotX = this.player.rotation.x;
    this.holdCompleteStartRotY = this.player.rotation.y;
    this.holdCompleteStartRotZ = this.player.rotation.z;

    this.isHoldComplete = true;
    this.isHolding = false;
    this.isPointerDown = false;
    this.isPlayerAnimFrozen = true;

    this.holdCompleteTime = this.time.elapsed * 0.001;

    this.holdAnim.progress = 1;
    this.holdAnim.wobble = 1;

    this.controls.setCursor("base");

    this.onComplete?.();
  }

  private updatePlayerHoldAnimation() {
    const t = this.time.elapsed * 0.001;
    const holdProgress = this.holdAnim.progress;

    const playerBaseY =
      (this.player.userData.baseY as number) ?? this.player.position.y;

    if (this.isHoldComplete) {
      const ts = t - this.holdCompleteTime;

      const floatBlend = Math.min(ts / 1.5, 1);
      const transitionBlend = Math.min(ts / HOLD_TO_FLOAT_BLEND_SECONDS, 1);

      const floatY =
        (Math.sin(ts * 1.2) * 0.08 + Math.sin(ts * 0.7) * 0.04) * floatBlend;

      const floatRX =
        (Math.sin(ts * 0.9) * 0.025 + Math.sin(ts * 0.5) * 0.015) * floatBlend;

      const floatRY =
        (Math.sin(ts * 0.7) * 0.02 + Math.sin(ts * 1.1) * 0.01) * floatBlend;

      const floatRZ =
        (Math.sin(ts * 0.6) * 0.018 + Math.sin(ts * 0.95) * 0.012) * floatBlend;

      const targetY = playerBaseY + HOLD_LIFT_MAX + floatY;
      const targetRotX = -Math.PI / 1.2 + floatRX;
      const targetRotY = floatRY;
      const targetRotZ = Math.PI + floatRZ;

      this.player.position.y = THREE.MathUtils.lerp(
        this.holdCompleteStartY,
        targetY,
        transitionBlend,
      );

      this.player.rotation.x = THREE.MathUtils.lerp(
        this.holdCompleteStartRotX,
        targetRotX,
        transitionBlend,
      );

      this.player.rotation.y = THREE.MathUtils.lerp(
        this.holdCompleteStartRotY,
        targetRotY,
        transitionBlend,
      );

      this.player.rotation.z = THREE.MathUtils.lerp(
        this.holdCompleteStartRotZ,
        targetRotZ,
        transitionBlend,
      );

      return;
    }

    const easedProgress = 1 - Math.pow(1 - holdProgress, 3);
    const holdLift = easedProgress * HOLD_LIFT_MAX;

    const holdWobble =
      Math.sin(t * 8) * 0.01 * holdProgress * this.holdAnim.wobble;

    this.player.position.y = playerBaseY + holdLift + holdWobble;

    const startRotX = -Math.PI / 2;
    const endRotX = -Math.PI / 1.2;

    this.player.rotation.x = THREE.MathUtils.lerp(
      startRotX,
      endRotX,
      holdProgress,
    );
  }

  public update() {
    if (this.shouldUpdatePlayerAnimator) {
      this.player.update();
    }

    this.updatePlayerHoldAnimation();
  }

  public destroy() {
    this.idleFreezeDelay?.kill();
    this.holdTimeline?.kill();

    this.controls.off("hold");
    this.controls.off("mousedown");
    this.controls.off("mouseup");
  }
}
