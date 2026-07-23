import type { GLTF } from "three/examples/jsm/Addons.js";
import * as THREE from "three/webgpu";
import { COLORS } from "~/constants";
import type Camera from "../../Camera";
import Experience from "../../Experience";
import Grass from "../../grass/Grass";
import type Chapter1Scene from "../../scenes/Chapter1Scene";
import type Controls from "../../utils/Controls";
import type Raycaster from "../../utils/Raycaster";
import type Resources from "../../utils/Resources";
import type SoundManager from "../../utils/SoundManager";
import type Time from "../../utils/Time";
import Butterflies from "../Butterflies";
import Particles from "../Particles";
import Player from "../Player";
import WindLines from "../WindLines";
import Floor from "./Floor";
import Flower from "./Flower";
import Mushroom from "./Mushroom";
import Rock from "./Rock";

export default class World {
  // FROM EXPERIENCE
  private time: Time;
  private resources: Resources;
  private controls: Controls;
  private soundManager: SoundManager;

  // FROM PARENT SCENE
  private chapter1: Chapter1Scene;
  public scene: THREE.Scene;
  public camera: Camera;
  public raycaster: Raycaster;

  // WORLD ELEMENTS
  private model!: THREE.Group;
  public rocks: Rock[] = [];
  public flowers: Flower[] = [];
  public mushrooms: Mushroom[] = [];
  private interactables: THREE.Mesh[] = [];
  private hovered: THREE.Mesh | null = null;
  private hoveredMushroom: Mushroom | null = null;
  private hoveredRock: Rock | null = null;
  declare private chunk: THREE.Group;

  private grass: Grass;
  private floor: Floor;
  public player: Player;
  private windLines: WindLines;
  private butterflies: Butterflies;
  private particles: Particles[] = [];

  // OTHER
  private readonly _camOffset = new THREE.Vector3(0, 3, 7);
  private readonly _camLookOffset = new THREE.Vector3(0, 0.5, 0);
  private readonly _diagonalTileSize = 8;
  private readonly _visibleTilesBehind = 2;
  private readonly _visibleTilesAhead = 2;
  private readonly _playerSpeed = 0.45;

  private repeatedChunks = new THREE.Group();
  private activeChunkTiles = new Map<number, THREE.Group>();
  private currentChunkIndex = Number.NaN;

  private readonly _diagonalDirection = new THREE.Vector3(1, 0, 1).normalize();

  constructor(chapter1: Chapter1Scene) {
    const { time, controls, resources, soundManager } =
      Experience.getInstance();
    this.time = time;
    this.controls = controls;
    this.resources = resources;
    this.soundManager = soundManager;

    this.chapter1 = chapter1;
    this.scene = chapter1.scene;
    this.camera = chapter1.camera;
    this.raycaster = chapter1.raycaster;

    this.grass = new Grass(this.scene, {
      count: 80000,
      areaSize: 8,

      showPlane: false,
    });
    this.player = new Player({
      scale: 1.2,
      position: new THREE.Vector3(0, 0, 0),
      rotationY: Math.PI / 4,
    });
    // this.player.animator.playIdle();
    this.player.animator.playWalk();
    this.scene.add(this.player);

    this.floor = new Floor(this.camera);
    this.scene.add(this.floor);

    this.windLines = new WindLines(this.scene, this.player);
    this.butterflies = new Butterflies(this.scene, {
      origin: new THREE.Vector3(0, 1, 0),
      count: 15,
      wanderSize: 5,
      yMin: 0.5,
      color: new THREE.Color(COLORS.entityColor),
    });
    this.chunk = new THREE.Group();

    if (this.resources.items.chapter1) {
      const temp = this.resources.items.chapter1 as GLTF;
      this.model = temp.scene.clone() as THREE.Group;
      this.model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshStandardMaterial;
          mat.metalness = 0;
          mat.needsUpdate = true;
        }
      });
      this.model.scale.setScalar(2);
      this.model.rotation.y = -Math.PI / 2;
      this.model.position.z = -2;
      this.model.updateMatrixWorld(true);

      // ROCKS INIT
      const rocksGroup = this.model.children.find(
        (child) => child.name === "stones",
      ) as THREE.Group | undefined;

      if (rocksGroup) {
        rocksGroup.children.map((child) => {
          const rock = new Rock(child);
          this.rocks.push(rock);
          this.chunk.add(rock);
          if (rock.blob) {
            this.interactables.push(rock.blob);
          }
        });
      }

      // FLOWERS INIT
      const flowersGroup = this.model.children.find(
        (child) => child.name === "flowers",
      ) as THREE.Group | undefined;

      if (flowersGroup) {
        flowersGroup.children.map((child) => {
          const flower = new Flower(child);
          this.flowers.push(flower);
          this.chunk.add(flower);
        });
      }

      // MUSHROOMS INIT
      const mushroomsGroup = this.model.children.find(
        (child) => child.name === "mushroom",
      ) as THREE.Group | undefined;

      if (mushroomsGroup) {
        mushroomsGroup.children.map((child) => {
          const mushroom = new Mushroom(child);
          this.mushrooms.push(mushroom);
          this.chunk.add(mushroom);
          this.interactables.push(mushroom);
        });
      }
    }
    this.scene.add(this.chunk);
    this.scene.add(this.repeatedChunks);
    this.updateDiagonalRepeats(true);

    // EVENTS
    controls.on("click", this.handleClick.bind(this));
  }

  private handleHover() {
    const intersects = this.raycaster.intersectObjects(
      this.interactables,
      false,
    );
    if (intersects.length > 0) {
      const first = intersects[0]?.object as THREE.Mesh;
      if (first !== this.hovered) {
        this.hovered = first;
        this.hoveredMushroom =
          this.mushrooms.find(
            (m) => m === first || m.material === first.material,
          ) ?? null;
        this.hoveredRock =
          this.rocks.find((r) => r.blob?.material === first.material) ?? null;
      }
      this.controls.setCursor("hover");
    } else {
      this.controls.setCursor("base");
      this.hovered = null;
      this.hoveredMushroom = null;
      this.hoveredRock = null;
    }
  }

  private handleClick() {
    if (this.hovered) {
      this.interactables = this.interactables.filter(
        (obj) => obj !== this.hovered,
      );
      this.soundManager.play("s1sparkles");
      if (this.hovered.name.toLowerCase().includes("blob")) {
        this.soundManager.play("stoneclick");
      }

      this.chapter1.interact();
      this.particles.push(
        new Particles(this.scene, 200, {
          from: this.hovered.getWorldPosition(new THREE.Vector3()),
          to: () =>
            this.player.position.clone().add(new THREE.Vector3(0, 0.5, 0)) ??
            new THREE.Vector3(),
          noiseFreq: 2.5,
          noiseScale: 1.5,
          minDuration: 2,
          maxDuration: 4,
          minDelay: 0,
          maxDelay: 2,
          singleNoise: true,
          baseDirection: new THREE.Vector3(0, 1, 0),
          baseDirectionBlend: 0.8,
        }),
      );
    }
  }

  // INFINITE CHUNKS LOGICS
  private getPlayerDiagonalChunkIndex() {
    const p = this.player.position;
    const diagonalProgress = (p.x + p.z) * 0.5;
    return Math.floor(diagonalProgress / this._diagonalTileSize);
  }

  private updateDiagonalRepeats(force = false) {
    const centerIndex = this.getPlayerDiagonalChunkIndex();

    if (!force && centerIndex === this.currentChunkIndex) return;

    this.currentChunkIndex = centerIndex;

    const minIndex = centerIndex - this._visibleTilesBehind;
    const maxIndex = centerIndex + this._visibleTilesAhead;

    for (const [index, chunk] of this.activeChunkTiles) {
      if (index < minIndex || index > maxIndex) {
        this.removeChunkInteractables(chunk);
        this.repeatedChunks.remove(chunk);
        this.disposeChunk(chunk);
        this.activeChunkTiles.delete(index);
      }
    }

    for (let index = minIndex; index <= maxIndex; index++) {
      if (index === 0) continue;

      if (!this.activeChunkTiles.has(index)) {
        const chunk = this.createRepeatedChunk(index);
        this.activeChunkTiles.set(index, chunk);
        this.repeatedChunks.add(chunk);
      }
    }
  }

  private createRepeatedChunk(index: number) {
    const repeatedChunk = this.cloneAsPlainObject(this.chunk) as THREE.Group;

    repeatedChunk.position.x += index * this._diagonalTileSize;
    repeatedChunk.position.z += index * this._diagonalTileSize;

    repeatedChunk.updateMatrixWorld(true);

    this.addChunkInteractables(repeatedChunk);

    return repeatedChunk;
  }

  private cloneAsPlainObject(source: THREE.Object3D): THREE.Object3D {
    let clone: THREE.Object3D;

    if (source instanceof THREE.Mesh) {
      clone = new THREE.Mesh(source.geometry, source.material);
    } else if (source instanceof THREE.Group) {
      clone = new THREE.Group();
    } else {
      clone = new THREE.Object3D();
    }

    clone.name = source.name;
    clone.position.copy(source.position);
    clone.rotation.copy(source.rotation);
    clone.quaternion.copy(source.quaternion);
    clone.scale.copy(source.scale);
    clone.matrix.copy(source.matrix);
    clone.matrixWorld.copy(source.matrixWorld);
    clone.matrixAutoUpdate = source.matrixAutoUpdate;
    clone.visible = source.visible;
    clone.castShadow = source.castShadow;
    clone.receiveShadow = source.receiveShadow;
    clone.renderOrder = source.renderOrder;

    source.children.forEach((child) => {
      clone.add(this.cloneAsPlainObject(child));
    });

    return clone;
  }

  private addChunkInteractables(chunk: THREE.Group) {
    chunk.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      const name = child.name.toLowerCase();
      const parentName = child.parent?.name.toLowerCase() ?? "";

      const isRockBlob = name.includes("blob");
      const isMushroom = name.includes("mush") || parentName.includes("mush");

      if (isRockBlob || isMushroom) {
        this.interactables.push(child);
      }
    });
  }

  private removeChunkInteractables(chunk: THREE.Group) {
    const meshesToRemove: THREE.Mesh[] = [];

    chunk.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshesToRemove.push(child);
      }
    });

    this.interactables = this.interactables.filter(
      (mesh) => !meshesToRemove.includes(mesh),
    );
  }

  private disposeChunk(chunk: THREE.Group) {
    chunk.clear();
  }

  // UPDATE
  public update() {
    const dt = this.time.delta / 1000;
    this.grass.update(dt, this.camera.instance, this.player.position);
    this.floor.update();
    this.butterflies.update();
    this.particles.map((p) => {
      p.update();
      if (p.isDestroyed) {
        this.particles = this.particles.filter((part) => part !== p);
      }
    });

    this.player.update();
    const playerPos = this.player.position;
    if (playerPos) {
      const targetPos = playerPos.clone().add(this._camOffset);
      this.camera.instance.position.lerp(targetPos, Math.min(8 * dt, 1));
      this.camera.instance.lookAt(playerPos.clone().add(this._camLookOffset));
    }

    // MOVE THE PLAYER X AND Z
    this.player.position.addScaledVector(
      this._diagonalDirection,
      this._playerSpeed * dt,
    );
    this.butterflies.position.addScaledVector(
      this._diagonalDirection,
      this._playerSpeed * dt,
    );
    this.updateDiagonalRepeats();

    this.handleHover();

    for (const mushroom of this.mushrooms) {
      mushroom.targetBloom = mushroom === this.hoveredMushroom ? 2.0 : 1.2;
      mushroom.update(dt);
    }

    for (const rock of this.rocks) {
      rock.targetBloom = rock === this.hoveredRock ? 2.0 : 1.0;
      rock.update(dt);
    }
  }

  public destroy() {
    this.grass.destroy();
    this.player.destroy();
    this.butterflies.destroy();
    this.particles.forEach((p) => p.destroy());
    this.windLines = undefined as any;
    this.controls.off("click");
  }
}
