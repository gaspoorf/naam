import gsap from "gsap";
import type { GLTF } from "three/examples/jsm/Addons.js";
import * as THREE from "three/webgpu";
import type Camera from "../../Camera";
import Experience from "../../Experience";
import type Chapter3Scene from "../../scenes/Chapter3Scene";
import type Controls from "../../utils/Controls";
import type Raycaster from "../../utils/Raycaster";
import type Resources from "../../utils/Resources";
import type SoundManager from "../../utils/SoundManager";
import type Time from "../../utils/Time";
import Butterflies from "../Butterflies";
import Particles from "../Particles";
import Player from "../Player";
import Mushroom from "./Mushroom";
import NervEntity from "./NervEntity";
import TreeEntity from "./TreeEntity";

export default class World {
  // FROM EXPERIENCE
  private time: Time;
  private resources: Resources;
  private controls: Controls;
  private soundManager: SoundManager;

  // FROM PARENT SCENE
  public scene: THREE.Scene;
  public camera: Camera;
  public raycaster: Raycaster;
  private parentScene: Chapter3Scene;

  // WORLD ELEMENTS
  private model!: THREE.Group;
  public mushrooms: Mushroom[] = [];
  private interactables: THREE.Mesh[] = [];
  private hovered: THREE.Mesh | null = null;
  public treeEntity!: TreeEntity;
  public nervEntity!: NervEntity;
  public player: Player;
  private butterflies: Butterflies;
  private particles: Particles[] = [];

  //trees
  public treeClicked = 0;
  public static allTrees = 5;

  //player
  private playerReachedTarget = false;
  private playWalk = false;

  //camera
  private camTransitionAlpha = 0;
  public isTransitioning = false;
  private camStartPos = new THREE.Vector3();
  private camEndPos = new THREE.Vector3();
  private camStartLookAt = new THREE.Vector3();
  private camEndLookAt = new THREE.Vector3();
  private currentLookAt = new THREE.Vector3();

  private groundSoundPlayed = false;
  private shakeStopNotified = false;

  constructor(chapter3: Chapter3Scene) {
    const { time, controls, resources, soundManager } =
      Experience.getInstance();
    this.time = time;
    this.controls = controls;
    this.resources = resources;
    this.soundManager = soundManager;

    this.scene = chapter3.scene;

    this.parentScene = chapter3;
    this.camera = chapter3.camera;
    this.raycaster = chapter3.raycaster;

    this.player = new Player({
      scale: 0.8,
      position: new THREE.Vector3(0.5, -0.22, -6),
      rotationY: Math.PI / 0.55,
    });

    this.player.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.player.animator.playWalk();
    this.scene.add(this.player);

    //mouvement cam
    this.currentLookAt.set(1.5, -0.3, 0);
    this.camera.instance.lookAt(this.currentLookAt);

    gsap.delayedCall(3, () => {
      this.startCameraTransition(
        new THREE.Vector3(-1, 3.7, -11),
        new THREE.Vector3(0.7, -1, 0),
      );
    });

    this.butterflies = new Butterflies(this.scene, {
      origin: new THREE.Vector3(1, 1, 0),
      count: 15,
      wanderSize: 5,
      yMin: 0.5,
      color: new THREE.Color(0xffeebb),
    });

    const temp = this.resources.items.chapter3 as GLTF;
    this.model = temp.scene.clone() as THREE.Group;
    this.model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        const mat = child.material as THREE.MeshStandardMaterial;
        if (mat.alphaTest > 0 || mat.transparent) {
          mat.transparent = false;
          mat.depthWrite = true;

          if (mat.alphaTest === 0) mat.alphaTest = 0.5;
        }
      }
    });

    this.treeEntity = new TreeEntity(
      this.raycaster,
      this.camera.instance,
      this.model,
      this.parentScene,
    );

    this.nervEntity = new NervEntity(this.model);

    this.model.position.set(0, 0, 0);
    this.model.updateMatrixWorld(true);
    this.scene.add(this.model);

    // MUSHROOMS INIT
    this.model.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.name.toLowerCase().includes("mush-set")
      ) {
        const mushroom = new Mushroom(child);
        this.mushrooms.push(mushroom);
        this.scene.add(mushroom);
        this.interactables.push(mushroom);
      }
    });
  }

  private movePlayer(target: THREE.Vector3) {
    const playerPos = this.player.position;
    const targetPos = target.clone();
    targetPos.y = playerPos.y;

    const diff = new THREE.Vector3().subVectors(targetPos, playerPos);
    const distance = diff.length();

    const maxSpeed = 0.3;

    if (distance > 0.05) {
      if (!this.playWalk) {
        this.soundManager.play("s3-walking");
        this.playWalk = true;
      }

      this.playerReachedTarget = false;

      let speed = distance * 4.0;
      speed = Math.min(speed, maxSpeed);

      const dt = this.time.delta / 1000;
      const moveStep = diff.normalize().multiplyScalar(speed * dt);
      playerPos.add(moveStep);

      this.player.animator.setWalkSpeed(speed / maxSpeed);
    } else {
      if (!this.playerReachedTarget) {
        this.playerReachedTarget = true;
        this.player.animator.playIdle(0.5);
      }
      // this.soundManager.items.("s2holdrelease")?.fade(0.5, 0, 1);
      // this.soundManager.items."s3-walking".fade(0, 0.5, true);
    }
  }

  public startCameraTransition(
    targetPos: THREE.Vector3,
    targetLookAt: THREE.Vector3,
  ) {
    this.camStartPos.copy(this.camera.instance.position);
    this.camEndPos.copy(targetPos);

    this.camStartLookAt.copy(this.currentLookAt);
    this.camEndLookAt.copy(targetLookAt);

    this.camTransitionAlpha = 0;
    this.isTransitioning = true;
  }

  private _hoverLogThrottle = 0;

  private handleHover() {
    const intersects = this.raycaster.intersectObjects(
      this.interactables,
      false,
    );

    this._hoverLogThrottle++;

    if (intersects.length > 0) {
      const first = intersects[0]?.object;
      if (first !== this.hovered) {
        this.hovered = first as THREE.Mesh;
      }
    } else {
      this.hovered = null;
    }
  }

  public update() {
    const dt = this.time.delta / 1000;

    if (this.isTransitioning) {
      const durationSpeed = 0.4;
      this.camTransitionAlpha += dt * durationSpeed;

      if (this.camTransitionAlpha >= 1) {
        this.camTransitionAlpha = 1;
        this.isTransitioning = false;
        this.parentScene.cameraTargetPosition.copy(this.camEndPos);
      }

      const tPos = THREE.MathUtils.smoothstep(this.camTransitionAlpha, 0, 1);
      this.camera.instance.position.lerpVectors(
        this.camStartPos,
        this.camEndPos,
        tPos,
      );

      this.currentLookAt.lerpVectors(
        this.camStartLookAt,
        this.camEndLookAt,
        tPos,
      );
      this.camera.instance.lookAt(this.currentLookAt);
    }

    this.treeEntity.update();
    this.nervEntity.update();

    this.butterflies.update();
    this.particles.map((p) => {
      p.update();
      if (p.isDestroyed) {
        this.particles = this.particles.filter((part) => part !== p);
      }
    });
    this.player?.update();
    this.handleHover();

    // this.movePlayer(new THREE.Vector3(-0.75, 0.1, -4));
    this.movePlayer(new THREE.Vector3(-0.45, 0.1, -3.2));

    // nerv progress
    const completed = this.treeEntity.getCompletedCount();
    const total = this.treeEntity.getTotalCount();

    const steps = [0, 0.55, 0.6, 0.7, 0.8, 1.0];

    if (total > 0) {
      // const progress = completed / total;
      const progress = steps[completed] ?? 1.0;
      if (!this.nervEntity.hideStarted) {
        this.nervEntity.setProgress(progress);
      }
    }

    if (total === completed && !this.groundSoundPlayed) {
      this.soundManager.play("s3ground");
      this.groundSoundPlayed = true;
      gsap.delayedCall(0.7, () => this.parentScene.startCameraShake());

      gsap.delayedCall(4, () => {
        this.parentScene.lastInteraction();
      });
    }

    if (this.nervEntity.sparkleProgressValue > 0.8 && !this.shakeStopNotified) {
      this.shakeStopNotified = true;
      this.parentScene.stopCameraShake(4);
    }

    for (const mushroom of this.mushrooms) {
      // const prevTarget = mushroom.targetBloom;
      mushroom.targetBloom = mushroom === this.hovered ? 0.5 : 0.2;
      mushroom.update(dt);
    }
  }

  public destroy() {
    this.butterflies.destroy();
    this.particles.forEach((p) => p.destroy());
    this.player?.destroy();
    this.treeEntity.destroy();
    this.nervEntity.destroy();
    this.controls.off("click");
  }
}
