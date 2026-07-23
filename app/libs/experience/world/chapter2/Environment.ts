import type { FolderApi } from "tweakpane";
import type Chapter2Scene from "../../scenes/Chapter2Scene";

import * as THREE from "three/webgpu";

export default class Environment {
  private scene: THREE.Scene;
  private debugFolder: FolderApi;

  private ambientLight: THREE.AmbientLight;

  // Tweakpane binding objects
  private params = {
    background: "#030e20",
    fog: {
      color: "#030e20",
      density: 0.039,
    },
    ambientLight: {
      color: "#b8ecff",
      intensity: 1.85,
    },
  };

  constructor(chapter2: Chapter2Scene) {
    this.scene = chapter2.scene;

    this.debugFolder = chapter2.debugFolder.addFolder({
      title: "☀️ Environnement",
      expanded: false,
    });

    this.scene.background = new THREE.Color(this.params.background);
    this.scene.fog = new THREE.FogExp2(
      new THREE.Color(this.params.fog.color),
      this.params.fog.density,
    );

    // AMBIENT LIGHT
    this.ambientLight = new THREE.AmbientLight(
      new THREE.Color(this.params.ambientLight.color),
      this.params.ambientLight.intensity,
    );
    this.scene.add(this.ambientLight);

    // DIRECTIONAL LIGHT
    const directionalLight = new THREE.DirectionalLight(
      new THREE.Color(this.params.ambientLight.color),
      0.5,
    );
    directionalLight.position.set(5, 10, 5);
    this.scene.add(directionalLight);

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
        max: 0.5,
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
        max: 10,
        step: 0.01,
      })
      .on("change", ({ value }) => {
        this.ambientLight.intensity = value;
      });
  }

  public update() {}
}
