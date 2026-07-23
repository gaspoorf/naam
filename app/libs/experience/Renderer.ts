import * as THREE from "three/webgpu";
import type Experience from "./Experience";

export default class Renderer {
  declare experience: Experience;
  declare canvas: Experience["canvas"];
  declare sizes: Experience["sizes"];
  declare instance: THREE.WebGPURenderer;

  constructor(experience: Experience) {
    this.experience = experience;
    this.canvas = this.experience.canvas;
    this.sizes = this.experience.sizes;
    this.setInstance();
    console.log("[Renderer] : Instanciated");
  }

  async setInstance() {
    this.instance = new THREE.WebGPURenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.instance.outputColorSpace = THREE.SRGBColorSpace;
    this.instance.toneMapping = THREE.CineonToneMapping;
    this.instance.toneMappingExposure = 1.75;
    this.instance.shadowMap.enabled = true;
    this.instance.shadowMap.type = THREE.PCFSoftShadowMap;
    this.instance.setSize(this.sizes.width, this.sizes.height);
    this.instance.setPixelRatio(this.sizes.pixelRatio);
    // this.instance.inspector = new Inspector();
    await this.instance.init();
    console.log("[Renderer] : Instance initialized");
  }

  resize() {
    this.instance.setSize(this.sizes.width, this.sizes.height);
    this.instance.setPixelRatio(this.sizes.pixelRatio);
  }
}
