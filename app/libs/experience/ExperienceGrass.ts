import * as THREE from "three/webgpu";
import { pass } from "three/tsl";
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";
import Camera from "./Camera";
import Renderer from "./Renderer";
import Sizes from "./utils/Sizes";
import Time from "./utils/Time";
import GrassGUI from "./utils/GrassGUI";
import Grass from "./grass/Grass.js";

export default class ExperienceGrass {
  public canvas: HTMLCanvasElement;
  public sizes: Sizes;
  public time: Time;
  public scene: THREE.Scene;
  public camera: Camera;
  public renderer: Renderer;
  public world: Grass;
  public gui: GrassGUI;
  private pipeline: THREE.RenderPipeline | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.sizes = new Sizes();
    this.time = new Time();
    this.scene = new THREE.Scene();

    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.FogExp2(0x000000, 0.08);

    this.camera = new Camera(this as any, this.scene, new THREE.Vector3(2, 10, 2));
    this.camera.instance.lookAt(0, 0, 0);

    this.renderer = new Renderer(this as any);
    this.renderer.instance.setClearColor(0x000000);

    this.gui = new GrassGUI(this.renderer);

    this.world = new Grass(this.scene, { resources: { items: {} } } as any, {
      count: 80000, areaSize: 12,
    });

    // Bloom post-processing — threshold 0.65 catches only the bright white sphere.
    this.renderer.instance.init().then(() => {
      const scenePass = pass(this.scene, this.camera.instance);
      const sceneColor = scenePass.getTextureNode("output");
      const bloomPass = bloom(sceneColor, 20.5, 0.8, 2.65);
      const combined = sceneColor.add(bloomPass);
      this.pipeline = new THREE.RenderPipeline(this.renderer.instance);
    });

    this.sizes.on("resize", () => {
      this.resize();
    });

    this.time.on("tick", () => {
      if (this.renderer.instance?.initialized) this.update();
    });
  }

  public resize() {
    this.camera.resize();
    this.renderer.resize();
  }

  public update() {
    this.world.update(this.time.delta / 1000, this.camera.instance);
    if (this.pipeline) {
      this.pipeline.render();
    } else {
      this.renderer.update();
    }
  }

  public destroy() {
    this.sizes.off("resize");
    this.time.off("tick");

    this.world.destroy();

    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const material = child.material as any;
        if (material && typeof material.dispose === "function") material.dispose();
      }
    });

    this.sizes.destroy();
    this.renderer.instance.dispose();
  }
}
