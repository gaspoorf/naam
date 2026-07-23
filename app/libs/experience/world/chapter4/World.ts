import type { GLTF } from "three/examples/jsm/Addons.js";
import * as THREE from "three/webgpu";
import { COLORS } from "~/constants";
import type Camera from "../../Camera";
import type Chapter4Scene from "../../scenes/Chapter4Scene";
import type Controls from "../../utils/Controls";
import type { EventEmitter } from "../../utils/EventEmitter";
import type Raycaster from "../../utils/Raycaster";
import type Resources from "../../utils/Resources";
import type Time from "../../utils/Time";
import Butterflies from "../Butterflies";
import Player from "../Player";
import Godrays from "./Godrays";
import HoldParticles from "./HoldParticles";
import S4Animation from "./S4Animation";
import S4EntityRock from "./S4EntityRock";
import S4EntityTree from "./S4EntityTree";
import S4FloatingRock from "./S4FloatingRock";
import S4Floor from "./S4Floor";
import S4Mushrooms from "./S4Mushrooms";
import S4Rocks from "./S4Rocks";
import Spiral from "./Spiral";

const POST_HOLD_PARTICLE_DELAY_SECONDS = 0.1;
const POST_HOLD_PARTICLE_STAGGER_SECONDS = 0.1;

export default class World {
  // FROM EXPERIENCE
  private events: EventEmitter;
  private time: Time;
  private resources: Resources;
  private controls: Controls;

  // FROM PARENT SCENE
  private chapter4: Chapter4Scene;
  public scene: THREE.Scene;
  public camera: Camera;
  public raycaster: Raycaster;

  // WORLD ELEMENTS
  declare public player: Player;
  declare private butterflies: Butterflies;
  declare private model: THREE.Group;
  declare private spiral: Spiral;
  declare private floor: S4Floor;
  declare private godrays: Godrays;
  declare private rocks: S4Rocks;
  // declare private mushrooms: S4Mushrooms;
  public mushrooms: S4Mushrooms[] = [];
  declare private entityTree: S4EntityTree;
  private entityRocks: S4EntityRock[] = [];
  private floatingRocks: S4FloatingRock[] = [];
  private particles: HoldParticles[] = [];
  private activeHoldParticles: HoldParticles[] = [];
  private hoveredMushroomMesh: THREE.Mesh | null = null;

  // ANIMATION/INTERACTION LOGICS
  declare private animation: S4Animation;

  constructor(chapter: Chapter4Scene) {
    const { time, resources, controls, events } = chapter.experience;
    this.time = time;
    this.resources = resources;
    this.controls = controls;
    this.events = events;

    this.chapter4 = chapter;
    this.scene = chapter.scene;
    this.camera = chapter.camera;
    this.raycaster = chapter.raycaster;

    // INIT
    this.init();
  }

  // INITIALIZATION
  private init() {
    // PLAYER
    this.player = new Player({
      scale: 1,
      position: new THREE.Vector3(2, 2, 2),
      rotationY: 2.4,
    });
    this.player.animator.initArmsUp();
    this.player.rotation.x = -Math.PI;
    this.player.rotation.y = 0;
    this.player.rotation.z = Math.PI;
    this.scene.add(this.player);

    // BUTTERFLIES
    this.butterflies = new Butterflies(this.scene, {
      origin: new THREE.Vector3(0, 1, -15),
      count: 20,
      wanderSize: 8,
      yMin: 0.5,
    });
    this.scene.add(this.butterflies);

    // GODRAYS
    this.godrays = new Godrays({
      position: [2, 2.3, -15],
      rotation: [0, 0, 0],
      color: COLORS.s4godrayColor,
      topRadius: 1,
      bottomRadius: 2.5,
      height: 4.5,
      timeSpeed: 0.08,
      noiseScale: 4.4,
      smoothBottom: 0.4,
      smoothTop: 0.2,
      fresnelPower: 4,
    });
    this.scene.add(this.godrays);

    // MODEL
    if (this.resources.items.chapter4) {
      const temp = this.resources.items.chapter4 as GLTF;
      this.model = temp.scene.clone() as THREE.Group;
      this.model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshStandardMaterial;
          mat.metalness = 0;
          mat.needsUpdate = true;
        }
      });
      this.model.rotation.y = Math.PI;
      this.model.updateMatrixWorld(true);
    } else {
      throw new Error("Chapter 4 model not found in resources");
    }

    this.model.children.map((child) => {
      // SPIRAL
      if (child.name.toLowerCase().includes("spiral")) {
        this.spiral = new Spiral(child, this.resources);
        this.scene.add(this.spiral);
      }

      // FLOOR
      if (child.name === "floor") {
        this.floor = new S4Floor(this.scene, this.camera, child);
        this.scene.add(this.floor);
      }

      // ROCKS
      if (child.name === "rocks") {
        this.rocks = new S4Rocks(child);
        this.scene.add(this.rocks);
      }

      // MUSHROOMS
      if (child.name === "mushes") {
        const mushroomsGroup = new S4Mushrooms(child);
        this.mushrooms.push(mushroomsGroup);
        this.scene.add(mushroomsGroup);
      }

      // ENTITY TREE
      if (child.name.includes("tree")) {
        this.entityTree = new S4EntityTree(child);
        this.scene.add(this.entityTree);
      }

      // ENTITY ROCKS
      if (child.name.includes("rock-w-eyes")) {
        child.children.forEach((rockChild) => {
          const entityRock = new S4EntityRock(rockChild);
          this.entityRocks.push(entityRock);
          this.scene.add(entityRock);
        });
      }

      // FLOATING ROCKS
      if (child.name.includes("flying-rock")) {
        child.children.forEach((rockChild, index) => {
          const flyingRock = new S4FloatingRock(rockChild, index);
          this.floatingRocks.push(flyingRock);
          this.scene.add(flyingRock);
        });
      }

      // PLAYER POS
      if (child.name === "NaamPos") {
        this.player?.position.copy(child.getWorldPosition(new THREE.Vector3()));
        if (this.player) this.player.userData.baseY = this.player.position.y;
      }
    });

    // ANIMATION
    this.animation = new S4Animation({
      time: this.time,
      controls: this.controls,
      player: this.player,
      onBegin: () => {
        this.events.trigger("ui:cursor", [{ value: "hold" }]);
        this.emitParticlesFromFloatingRocks();
        this.chapter4.soundManager.reset("s4-hold");
        this.chapter4.soundManager.items["s4-hold"]?.fade(0, 0.8, 300);
        this.chapter4.soundManager.play("s4-hold");
      },
      onRelease: () => {
        this.reverseHoldParticles();
        this.chapter4.soundManager.items["s4-hold"]?.fade(0.8, 0, 500);
        this.events.trigger("ui:cursor", [{ value: "hover" }]);
      },
      onComplete: () => {
        this.activeHoldParticles = [];
        this.chapter4.interact();
        // gsap.delayedCall(POST_HOLD_PARTICLE_DELAY_SECONDS, () => {
        //   if (this.animation.isComplete) {
        //     this.emitParticlesFromPlayerToEntities();
        //   }
        // });
        if (this.animation.isComplete) {
          this.emitParticlesFromPlayerToEntities();
        }
      },
    });
  }

  // INTERACTIONS
  private handleMushroomHover() {
    if (this.mushrooms.length === 0) return;
    const intersects = this.raycaster.intersectObjects(this.mushrooms, true);
    this.hoveredMushroomMesh = intersects.length > 0
      ? (intersects[0]?.object as THREE.Mesh ?? null)
      : null;
  }

  private handleHover() {
    if (!this.spiral) return;
    if (this.animation.isComplete) {
      this.controls.setCursor("base");
      this.animation.setHover(false);
      return;
    }
    const intersects = this.raycaster.intersectObject(this.spiral, false);
    const isHover = intersects.length > 0;
    this.controls.setCursor(isHover ? "hover" : "base");
    this.animation.setHover(isHover);
  }

  // ANIMATION
  public get holdProgress() {
    return this.animation.progress;
  }

  private createBurst(
    from: () => THREE.Vector3,
    to: () => THREE.Vector3,
    dir: THREE.Vector3,
    delayOffset = 0,
    duration = 2,
  ) {
    return new HoldParticles(this.scene, 90, {
      from,
      to,
      noiseFreq: 2.5,
      noiseScale: 1,
      minDuration: duration - 0.5,
      maxDuration: duration + 0.5,
      minDelay: delayOffset,
      maxDelay: delayOffset + 0.8,
      singleNoise: true,
      baseDirection: dir,
      baseDirectionBlend: 0.8,
    });
  }

  private emitParticlesFromFloatingRocks() {
    if (!this.player || this.floatingRocks.length === 0) return;

    this.activeHoldParticles = [];

    const playerPos = () =>
      this.player.position.clone().add(new THREE.Vector3(0, 0.3, 0));

    this.floatingRocks.forEach((rock) => {
      const burst = this.createBurst(
        () => rock.getWorldPosition(new THREE.Vector3()),
        playerPos,
        new THREE.Vector3(0, 1, 0),
      );

      this.particles.push(burst);
      this.activeHoldParticles.push(burst);
    });
  }

  private reverseHoldParticles() {
    this.activeHoldParticles = this.activeHoldParticles.filter(
      (particle) => !particle.isDestroyed,
    );

    this.activeHoldParticles.forEach((particle) => {
      particle.reverse();
    });

    this.activeHoldParticles = [];
  }

  private getEntityEyeTargets() {
    const targets: THREE.Mesh[] = [];

    this.entityRocks.forEach((rock) => {
      if (rock.eyes) targets.push(rock.eyes);
    });

    if (this.entityTree?.eyes) {
      targets.push(this.entityTree.eyes);
    }

    return targets;
  }

  private emitParticlesFromPlayerToEntities() {
    if (!this.player) return;

    const targets = this.getEntityEyeTargets();
    if (targets.length === 0) return;

    const playerPos = () =>
      this.player.position.clone().add(new THREE.Vector3(0, 0.3, 0));

    targets.forEach((target, index) => {
      const burst = this.createBurst(
        playerPos,
        () => target.getWorldPosition(new THREE.Vector3()),
        // Direction from player to target
        new THREE.Vector3()
          .subVectors(target.getWorldPosition(new THREE.Vector3()), playerPos())
          .normalize(),
        index * POST_HOLD_PARTICLE_STAGGER_SECONDS,
        1.5,
      );

      this.particles.push(burst);
      this.entityRocks.map((rock) => rock.reveal());
    });

    this.entityTree?.reveal();
  }

  private updateParticles() {
    this.particles.forEach((particle) => {
      particle.update();
    });

    this.particles = this.particles.filter((particle) => !particle.isDestroyed);
  }

  private updateCursor() {
    if (this.animation.isHolding && !this.animation.isHoldComplete) {
      this.events.trigger("ui:hold-progress", [
        { value: this.animation.progress },
      ]);
    }
  }

  // CORE
  update() {
    const dt = this.time.delta / 1000;
    
    this.butterflies.update();
    this.godrays.update(this.animation.progress);
    this.spiral.update(this.animation.progress);
    this.floor.update();
    this.floatingRocks.map((rock) => rock.update());
    this.updateParticles();
    this.raycaster.update();
    this.handleHover();
    this.handleMushroomHover();
    this.animation.update();
    this.updateCursor();

    for (const mushroom of this.mushrooms) {
      mushroom.setHovered(this.hoveredMushroomMesh);
      mushroom.update(dt);
    }
  }

  destroy() {
    this.animation.destroy();
    this.particles.forEach((particle) => particle.destroy());
    this.particles = [];
    this.activeHoldParticles = [];
    this.butterflies.destroy();
    this.player.destroy();
    this.floor.destroy();
  }
}
