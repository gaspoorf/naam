import type Chapter3Scene from "../../scenes/Chapter3Scene";
import * as THREE from "three/webgpu";

export default class Environment {
  private scene: THREE.Scene;
  private ambientLight: THREE.AmbientLight;
  private spotLight: THREE.SpotLight;

  private params = {
    background: "#030e20",
    fog: {
      color: "#030e20",
      density: 2,
      near: 3,
      far: 20,
    },
  };

  constructor(chapter3: Chapter3Scene) {
    this.scene = chapter3.scene;

    this.scene.background = new THREE.Color(this.params.background);
    this.scene.fog = new THREE.Fog( this.params.fog.color, this.params.fog.near, this.params.fog.far );

    // AMBIENT LIGHT
    this.ambientLight = new THREE.AmbientLight(0xa1c9eb, 0.6);
    this.scene.add(this.ambientLight);

    // SPOT LIGHT
    this.spotLight = new THREE.SpotLight(0xa1c9eb, 800, 100, Math.PI / 4, 1);
    this.spotLight.position.set(0, 3, 6);
    this.spotLight.castShadow = true;
    // this.spotLight.penumbra = 1;

    this.spotLight.shadow.mapSize.set(2048, 2048);
    this.spotLight.shadow.bias = 0.00001;
    this.spotLight.shadow.normalBias = 0.05;
    this.spotLight.shadow.camera.near = 0.05;
    this.spotLight.shadow.camera.far = 50;

    this.spotLight.shadow.camera.updateProjectionMatrix();
    // this.scene.add(this.spotLight.target);
    // this.spotLight.target.position.set(0, 0, -20);
    this.scene.add(this.spotLight);
  }

  public update() {}
}