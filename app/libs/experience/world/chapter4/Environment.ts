import type { FolderApi } from "tweakpane";
import type Chapter4Scene from "../../scenes/Chapter4Scene";

import * as THREE from "three/webgpu";
import type Time from "../../utils/Time";

export default class Environment {
  private scene: THREE.Scene;
  private debugFolder: FolderApi;
  private time: Time;

  private ambientLight: THREE.AmbientLight;
  private spotLight: THREE.SpotLight;

  private worldPlayer: Chapter4Scene["world"]["player"];
  private lastUpdateMs = performance.now();

  private params = {
    background: "#030e20",
    fog: {
      color: "#030e20",
      density: 0.07,
      // density: 0,
    },
    ambientLight: {
      color: "#b8ecff",
      intensity: 3.25,
    },
    spotLight: {
      color: "#b8ecff",
      intensity: 40,
      distance: 5,
      angle: Math.PI,
      penumbra: 0.65,
      x: 0,
      y: 0,
      z: 0,
      targetX: 0,
      targetY: 0,
      targetZ: 0,
    },
  };

  constructor(chapter4: Chapter4Scene) {
    this.time = chapter4.experience.time;
    this.scene = chapter4.scene;
    this.worldPlayer = chapter4.world.player;
    this.debugFolder = chapter4.debugFolder.addFolder({
      title: "Environnement",
      expanded: false,
    });
    this.scene.background = new THREE.Color(this.params.background);
    this.scene.fog = new THREE.FogExp2(
      this.params.fog.color,
      this.params.fog.density,
    );

    // AMBIENT LIGHT
    this.ambientLight = new THREE.AmbientLight(
      this.params.ambientLight.color,
      this.params.ambientLight.intensity,
    );
    this.scene.add(this.ambientLight);

    // SPOTLIGHT
    this.spotLight = new THREE.SpotLight(
      this.params.spotLight.color,
      this.params.spotLight.intensity,
      this.params.spotLight.distance,
      this.params.spotLight.angle,
      this.params.spotLight.penumbra,
      // this.params.spotLight.x,
    );
    this.scene.add(this.spotLight);
    this.scene.add(this.spotLight.target);

    this.setupDebug();
  }

  private setupDebug() {
    // ── SCENE ──────────────────────────────────────────────────────────────
    const sceneFolder = this.debugFolder.addFolder({
      title: "Scène",
      expanded: false,
    });

    sceneFolder
      .addBinding(this.params, "background", { label: "Background" })
      .on("change", ({ value }) => {
        this.scene.background = new THREE.Color(value);
      });

    sceneFolder
      .addBinding(this.params.fog, "color", { label: "Fog Color" })
      .on("change", ({ value }) => {
        this.scene.fog!.color = new THREE.Color(value);
      });

    sceneFolder
      .addBinding(this.params.fog, "density", {
        label: "Fog Density",
        min: 0,
        max: 100.5,
        step: 0.001,
      })
      .on("change", ({ value }) => {
        (this.scene.fog as THREE.FogExp2).density = value;
      });

    // ── AMBIENT LIGHT ──────────────────────────────────────────────────────
    const ambientFolder = this.debugFolder.addFolder({
      title: "Ambient Light",
      expanded: false,
    });

    ambientFolder
      .addBinding(this.params.ambientLight, "color", { label: "Color" })
      .on("change", ({ value }) => {
        this.ambientLight.color = new THREE.Color(value);
      });

    ambientFolder
      .addBinding(this.params.ambientLight, "intensity", {
        label: "Intensity",
        min: 0,
        max: 100,
        step: 0.01,
      })
      .on("change", ({ value }) => {
        this.ambientLight.intensity = value;
      });

    // ── SPOT LIGHT ─────────────────────────────────────────────────────────
    const spotFolder = this.debugFolder.addFolder({
      title: "Spot Light",
      expanded: false,
    });

    spotFolder
      .addBinding(this.params.spotLight, "color", { label: "Color" })
      .on("change", ({ value }) => {
        this.spotLight.color = new THREE.Color(value);
      });

    spotFolder
      .addBinding(this.params.spotLight, "intensity", {
        label: "Intensity",
        min: 0,
        max: 100,
        step: 0.01,
      })
      .on("change", ({ value }) => {
        this.spotLight.intensity = value;
      });

    spotFolder
      .addBinding(this.params.spotLight, "distance", {
        label: "Distance",
        min: 0,
        max: 20,
        step: 0.1,
      })
      .on("change", ({ value }) => {
        this.spotLight.distance = value;
      });

    spotFolder
      .addBinding(this.params.spotLight, "angle", {
        label: "Angle",
        min: 0,
        max: Math.PI / 2,
        step: 0.01,
      })
      .on("change", ({ value }) => {
        this.spotLight.angle = value;
      });

    spotFolder
      .addBinding(this.params.spotLight, "penumbra", {
        label: "Penumbra",
        min: 0,
        max: 1,
        step: 0.01,
      })
      .on("change", ({ value }) => {
        this.spotLight.penumbra = value;
      });

    const spotPosFolder = spotFolder.addFolder({
      title: "Position",
      expanded: false,
    });

    spotPosFolder
      .addBinding(this.params.spotLight, "x", {
        label: "X",
        min: -20,
        max: 20,
        step: 0.1,
      })
      .on("change", ({ value }) => {
        this.spotLight.position.x = value;
      });

    spotPosFolder
      .addBinding(this.params.spotLight, "y", {
        label: "Y",
        min: -20,
        max: 20,
        step: 0.1,
      })
      .on("change", ({ value }) => {
        this.spotLight.position.y = value;
      });

    spotPosFolder
      .addBinding(this.params.spotLight, "z", {
        label: "Z",
        min: -20,
        max: 20,
        step: 0.1,
      })
      .on("change", ({ value }) => {
        this.spotLight.position.z = value;
      });

    const spotTargetFolder = spotFolder.addFolder({
      title: "Target",
      expanded: false,
    });

    spotTargetFolder
      .addBinding(this.params.spotLight, "targetX", {
        label: "X",
        min: -20,
        max: 20,
        step: 0.1,
      })
      .on("change", ({ value }) => {
        this.spotLight.target.position.x = value;
        this.spotLight.target.updateMatrixWorld();
      });
  }

  public update() {
    const playerPos = this.worldPlayer?.position;
    if (playerPos) {
      this.spotLight.position.set(playerPos.x, playerPos.y + 2, playerPos.z);
      this.spotLight.target.position.set(playerPos.x, playerPos.y, playerPos.z);
      this.spotLight.target.updateMatrixWorld();
    }
    this.lastUpdateMs = this.time.current;
  }

  public destroy() {
    this.scene.remove(this.ambientLight);
    this.scene.remove(this.spotLight);
    this.scene.remove(this.spotLight.target);
  }
}
