import type { GLTF } from "three/examples/jsm/Addons.js";
import * as THREE from "three/webgpu";
import type Camera from "../../Camera";
import Experience from "../../Experience";
import Grass from "../../grass/Grass";
import type Chapter2Scene from "../../scenes/Chapter2Scene";
import type Controls from "../../utils/Controls";
import type { EventEmitter } from "../../utils/EventEmitter";
import type Raycaster from "../../utils/Raycaster";
import type Resources from "../../utils/Resources";
import type Time from "../../utils/Time";
import Player from "../Player";
import AmbientParticles from "./AmbientParticles";
import Borealis from "./Borealis";
import Floor from "./Floor";
import Mountain from "./Mountain";
import RockEntity from "./RockEntity";
import Tree from "./Tree";

type WorldAnimationPhase = "idle" | "holding" | "reverting" | "completed";

type WorldAnimationState = {
  phase: WorldAnimationPhase;

  holdProgress: number;

  rockRevealIntensity: number;
  cameraHoldIntensity: number;
  particleAttraction: number;
  particleDisperse: number;
  particleGlobalScale: number;
};
export default class World {
  // FROM EXPERIENCE
  private events: EventEmitter;
  private time: Time;
  private resources: Resources;
  private controls: Controls;

  // FROM PARENT SCENE
  private chapter: Chapter2Scene;
  public scene: THREE.Scene;
  public camera: Camera;
  public raycaster: Raycaster;

  // WORLD ELEMENTS
  private model!: THREE.Group;
  private floor!: Floor;
  public rockEntity!: RockEntity;
  private ambientParticles: AmbientParticles | null = null;
  private player: Player | null = null;
  private grass: Grass | null = null;
  private trees: Tree[] = [];
  private mountains: Mountain[] = [];
  private borealis: Borealis;

  // ANIMATION
  public animation: WorldAnimationState = {
    phase: "idle",
    holdProgress: 0,
    rockRevealIntensity: 0,
    cameraHoldIntensity: 0,
    particleAttraction: 0,
    particleDisperse: 0,
    particleGlobalScale: 1,
  };

  private hasCompletedHold = false;
  private completionProgress = 0;

  constructor(chapter2: Chapter2Scene) {
    const { time, controls, resources, events } = Experience.getInstance();
    this.time = time;
    this.controls = controls;
    this.resources = resources;
    this.events = events;

    this.chapter = chapter2;
    this.scene = chapter2.scene;
    this.camera = chapter2.camera;
    this.raycaster = chapter2.raycaster;

    // PLAYER
    this.player = new Player({
      scale: 1.2,
      position: new THREE.Vector3(-1.5, 0.95, -1.5),
      rotationY: 2.4,
    });
    this.player.animator.initArmsUp();
    this.scene.add(this.player);

    if (this.resources.items.chapter2) {
      const temp = this.resources.items.chapter2 as GLTF;
      const treeChildren: THREE.Mesh[] = [];
      const mountainChildren: THREE.Mesh[] = [];

      this.model = temp.scene.clone() as THREE.Group;
      this.model.rotation.y = Math.PI;
      this.model.updateMatrixWorld(true);
      console.log(this.model);

      this.model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshStandardMaterial;
          mat.metalness = 0;
          mat.roughness = 1;
          mat.needsUpdate = true;

          if (child.name.includes("arbre")) {
            treeChildren.push(child);
          } else if (child.name.includes("mountain")) {
            mountainChildren.push(child);
          }
        }
      });

      // TREES
      for (const child of treeChildren) {
        const tree = new Tree(child);
        this.scene.add(tree);
        child.parent?.remove(child);
        this.trees.push(tree);
      }

      // MOUNTAINS
      for (const child of mountainChildren) {
        const mountain = new Mountain(child);
        this.scene.add(mountain);
        child.parent?.remove(child);
        this.mountains.push(mountain);
      }

      // FLOOR
      const floorBase = this.model.getObjectByName("floor");

      if (floorBase) {
        this.floor = new Floor(floorBase);
        floorBase.parent?.remove(floorBase);
        this.model.add(this.floor);
        this.floor.updateMaterial((mat) => {
          mat.metalness = 0;
          mat.roughness = 1;
          mat.color.set(0x033330);
        });
      }

      // ROCK ENTITY
      this.rockEntity = new RockEntity(
        this.raycaster,
        this.model,

        // onHoldChange
        (isHeld) => {
          if (this.hasCompletedHold || !chapter2.isDisplayed) return;

          if (isHeld) {
            this.events.trigger("ui:cursor", [{ value: "hold" }]);
            this.animation.phase = "holding";
            this.player?.animator.playArmsUp();
            this.chapter.soundManager.reset("s2-hold");
            this.chapter.soundManager.items["s2-hold"]?.fade(0, 0.8, 200);
            this.chapter.soundManager.play("s2-hold", 0.1);
          } else {
            this.animation.phase = "reverting";
            this.player?.animator.stopArmsUp();
            this.chapter.soundManager.items["s2-hold"]?.fade(0.8, 0, 500);
            this.events.trigger("ui:cursor", [{ value: "hover" }]);
          }
        },

        // onHoldProgress
        (progress01) => {
          if (this.hasCompletedHold || !chapter2.isDisplayed) return;

          if (progress01 > 0 && this.animation.phase === "holding") {
            this.events.trigger("ui:hold-progress", [{ value: progress01 }]);
          }

          this.animation.holdProgress = progress01;

          if (progress01 <= 0 && this.animation.phase !== "completed") {
            this.animation.phase = "reverting";
          }
        },

        // onComplete
        () => {
          this.hasCompletedHold = true;
          this.animation.phase = "completed";
          this.completionProgress = 0;

          this.animation.holdProgress = 1;
          this.borealis.reveal();
          this.chapter.soundManager.playRate(
            "s1sparkles",
            Math.pow(2, -3 / 12),
          );

          this.player?.animator.stopArmsUp();
          this.chapter.interact();
        },
      );
      this.scene.add(this.model);
    }

    // PARTICLES
    this.ambientParticles = new AmbientParticles(this.scene, 500);

    // GRASS
    if (this.floor.meshes.length > 0) {
      this.grass = new Grass(this.scene, {
        count: 100000,
        areaSize: 20,
        refMeshes: this.floor.meshes,
        showPlane: false,
      });
    }

    // BOREALIS
    this.borealis = new Borealis();
    this.scene.add(this.borealis);
  }

  // UPDATE
  private updateGlobalAnimation(dt: number) {
    const anim = this.animation;

    if (anim.phase === "holding") {
      const target = anim.holdProgress;

      anim.rockRevealIntensity = THREE.MathUtils.lerp(
        anim.rockRevealIntensity,
        target,
        6 * dt,
      );

      anim.cameraHoldIntensity = THREE.MathUtils.lerp(
        anim.cameraHoldIntensity,
        target,
        6 * dt,
      );

      anim.particleAttraction = THREE.MathUtils.lerp(
        anim.particleAttraction,
        target,
        6 * dt,
      );
    } else if (anim.phase === "reverting") {
      anim.holdProgress = 0;

      anim.rockRevealIntensity = THREE.MathUtils.lerp(
        anim.rockRevealIntensity,
        0,
        3 * dt,
      );

      anim.cameraHoldIntensity = THREE.MathUtils.lerp(
        anim.cameraHoldIntensity,
        0,
        3 * dt,
      );

      anim.particleAttraction = THREE.MathUtils.lerp(
        anim.particleAttraction,
        0,
        3 * dt,
      );

      if (
        anim.rockRevealIntensity < 0.001 &&
        anim.cameraHoldIntensity < 0.001 &&
        anim.particleAttraction < 0.001
      ) {
        anim.phase = "idle";
      }
    } else if (anim.phase === "completed") {
      this.completionProgress = THREE.MathUtils.lerp(
        this.completionProgress,
        1,
        1.5 * dt,
      );

      // Les nervures restent visibles.
      anim.rockRevealIntensity = THREE.MathUtils.lerp(
        anim.rockRevealIntensity,
        1,
        5 * dt,
      );

      // La caméra revient au calme.
      anim.cameraHoldIntensity = THREE.MathUtils.lerp(
        anim.cameraHoldIntensity,
        0,
        3 * dt,
      );

      // Les particules ne sont plus attirées vers la roche.
      anim.particleAttraction = THREE.MathUtils.lerp(
        anim.particleAttraction,
        0,
        3 * dt,
      );
    }
  }

  public update() {
    const dt = this.time.delta / 1000;

    this.updateGlobalAnimation(dt);

    this.rockEntity.update();
    this.rockEntity.setRevealIntensity(this.animation.rockRevealIntensity);

    if (this.ambientParticles) {
      this.ambientParticles.uIntensity.value =
        this.animation.particleAttraction;
      this.ambientParticles.update();
    }

    this.player?.update();
    this.grass?.update(dt, this.camera.instance);
  }

  public destroy() {
    this.rockEntity.destroy();
    this.player?.destroy();
    this.grass?.destroy();
  }
}
