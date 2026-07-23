import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three/webgpu";

export default class PlayerAnimator {
  private mixer: THREE.AnimationMixer;
  private idleAction: THREE.AnimationAction | null = null;
  private walkAction: THREE.AnimationAction | null = null;
  private armsUpAction: THREE.AnimationAction | null = null;
  private elevateAction: THREE.AnimationAction | null = null;
  private _frozen = false;

  constructor(model: THREE.Object3D, gltf: GLTF) {
    this.mixer = new THREE.AnimationMixer(model);

    // ── Idle (première clip GLTF) ──────────────────────────────────────────
    const idleClip = gltf.animations[3];
    if (idleClip) {
      const idleClipClone = idleClip.clone();
      this.idleAction = this.mixer.clipAction(idleClipClone);
      this.idleAction.play();
      this._currentAction = this.idleAction;
    }

    const walkClip = gltf.animations[0];
    if (walkClip) {
      this.walkAction = this.mixer.clipAction(walkClip);
    }

    const armsUpClip = gltf.animations[1];
    if (armsUpClip) {
      this.armsUpAction = this.mixer.clipAction(armsUpClip);
      this.armsUpAction.setLoop(THREE.LoopOnce, 1);
      this.armsUpAction.clampWhenFinished = true;
    }

    const elevateClip = gltf.animations[2];
    if (elevateClip) {
      this.elevateAction = this.mixer.clipAction(elevateClip);
    }
  }

  // ── API publique ──────────────────────────────────────────────────────────

  playIdle(fade = 0.3) {
    if (!this.idleAction) return;
    this._transition(this.idleAction, fade);
  }

  playWalk(fade = 0.3) {
    if (!this.walkAction) return;
    this._transition(this.walkAction, fade);
  }

  setWalkSpeed(normalizedSpeed: number) {
    if (!this.walkAction) return;
    this.walkAction.timeScale = Math.max(0.1, normalizedSpeed);
  }

  initArmsUp() {
    if (!this.armsUpAction) return;

    // On évalue la frame 0 de armsUp et on gèle
    this.mixer.stopAllAction();
    this.armsUpAction.reset().play();
    this.mixer.update(0);
    this.armsUpAction.paused = true;
  }

  playArmsUp() {
    if (!this.armsUpAction) return;
    this.armsUpAction.paused = false;
    this.armsUpAction.timeScale = 1;
  }

  stopArmsUp() {
    if (this._frozen || !this.armsUpAction) return;

    this.armsUpAction.timeScale = -1;
  }

  freezeArmsUp() {
    this._frozen = true;
    if (this.armsUpAction && !this.armsUpAction.isRunning())
      this.armsUpAction.reset().fadeIn(0.3).play();
  }

  playElevate() {
    if (!this.elevateAction) return;
    this._transition(this.elevateAction, 0.3);
  }

  private _currentAction: THREE.AnimationAction | null = null;


  private _transition(nextAction: THREE.AnimationAction, duration: number) {
    if (this._currentAction === nextAction) return;

    const prevAction = this._currentAction;
    this._currentAction = nextAction;

    if (prevAction) {
      nextAction.enabled = true;
      nextAction.setEffectiveTimeScale(1);
      prevAction.crossFadeTo(nextAction, duration, false);
      nextAction.play();
    } else {
      nextAction.fadeIn(duration).play();
    }
  }

  update(delta: number) {
    this.mixer.update(delta);
  }

  destroy() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.mixer.getRoot());
  }
}
