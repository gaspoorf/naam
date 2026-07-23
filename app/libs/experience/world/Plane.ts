import {
  abs,
  float,
  floor,
  Fn,
  mix,
  positionLocal,
  positionWorld,
  sin,
  texture,
  time,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
  vertexStage,
} from "three/tsl";
import * as THREE from "three/webgpu";
import Experience from "../Experience";
import { perlinNoise3d } from "../tsl/perlinNoise3d";
import { coverUv } from "../tsl/utils";

export default class Plane extends THREE.Mesh {
  public override material: THREE.MeshBasicNodeMaterial;
  public override geometry: THREE.PlaneGeometry;
  private controls: Experience["controls"];
  private texture: THREE.Texture<HTMLImageElement>;
  private uniforms!: {
    uFrequency: THREE.UniformNode<"vec2", THREE.Vector2>;
    uSecondFrequency: THREE.UniformNode<"vec2", THREE.Vector2>;
    uTimeFactor: THREE.UniformNode<"float", number>;
    uColor: THREE.UniformNode<"color", THREE.Color>;
    uPixelSize: THREE.UniformNode<"float", number>;
    uTexture: THREE.UniformNode<"vec4", THREE.Texture>;
    uPlaneSizes: THREE.UniformNode<"vec2", THREE.Vector2>;
    uImageSizes: THREE.UniformNode<"vec2", THREE.Vector2>;
    uScrollSpeed: THREE.UniformNode<"float", number>;
  };

  private index: number;
  // private world: Experience["world"];
  private planeCount: number;
  private gap: number;
  //private gui: Experience["gui"];

  constructor(
    experience: Experience,
    index: number,
    texture: THREE.Texture<HTMLImageElement>,
    position = new THREE.Vector3(0, 0, 0),
    planeCount: number,
    gap: number,  
  ) {
    super();
    this.controls = experience.controls;
    this.planeCount = planeCount;
    this.gap = gap;
    // this.world = experience.world;
    //this.gui = experience.gui;
    this.geometry = new THREE.PlaneGeometry(1, 1, 16, 16);
    this.material = new THREE.MeshBasicNodeMaterial();
    this.scale.y = 2 / 3;
    this.texture = texture;
    this.position.copy(position);
    this.index = index;

    this.initUniforms();
    this.initMaterial();

    // this.gui.on("update", () => {
    //   this.updateUniforms();
    // });
  }

  private initUniforms() {
    this.uniforms = {
      uFrequency: uniform(new THREE.Vector2(3, 3)),
      uSecondFrequency: uniform(new THREE.Vector2(5, 5)),
      uTimeFactor: uniform(0.1),
      uColor: uniform(new THREE.Color("black")),
      uPixelSize: uniform(16),
      uTexture: uniform(texture(this.texture)),
      uPlaneSizes: uniform(new THREE.Vector2(1, 2 / 3)),
      uImageSizes: uniform(
        new THREE.Vector2(this.texture.image.width, this.texture.image.height),
      ),
      uScrollSpeed: uniform(0),
    };
  }

  private initMaterial() {
    const vGradient = vertexStage(abs(positionWorld.x.mul(0.5)).pow(2));

    const positionNode = Fn(() => {
      const PI = float(Math.PI);
      const pos = positionLocal;
      pos.z.addAssign(positionWorld.x.mul(0.5).pow(2).mul(2).sub(0.5));
      pos.x.addAssign(
        float(-1)
          .mul(sin(uv().y.mul(PI)))
          .mul(this.uniforms.uScrollSpeed.mul(1.5)),
      );
      return pos;
    })();

    const colorNode = Fn(() => {
      const uvNode = uv();
      const resolution = vec2(1024, (2 / 3) * 1024);
      const pixelSize = vec2(this.uniforms.uPixelSize);
      const normalizedPixelSize = pixelSize.div(resolution);
      const uvPixel = normalizedPixelSize.mul(
        floor(uvNode.div(normalizedPixelSize)),
      );

      const remappedUv = coverUv({
        uv: uvNode,
        planeSize: this.uniforms.uPlaneSizes,
        imageSize: this.uniforms.uImageSizes,
      });

      // Parrallax effect
      remappedUv.mulAssign(0.8);
      remappedUv.addAssign(0.1);
      remappedUv.x.addAssign(positionWorld.x.mul(0.1));

      const textureColor = texture(this.uniforms.uTexture.value, remappedUv);

      // Perlin noise
      const noiseUv = uvPixel.add(
        perlinNoise3d({
          P: vec3(
            uvPixel.x.mul(this.uniforms.uFrequency.x),
            uvPixel.y.mul(this.uniforms.uFrequency.y),
            time.mul(this.uniforms.uTimeFactor),
          ),
        }),
      );
      const noise = perlinNoise3d({
        P: vec3(
          noiseUv.x.mul(this.uniforms.uSecondFrequency.x),
          noiseUv.y.mul(this.uniforms.uSecondFrequency.y),
          time.mul(this.uniforms.uTimeFactor).mul(2),
        ),
      });

      // Combine noise and gradient
      const combined = mix(noise, 1.0, vGradient);
      combined.mulAssign(vGradient);
      combined.assign(combined.step(0.1));

      const finalColor = mix(
        vec4(this.uniforms.uColor, 1.0),
        textureColor,
        float(1.0).sub(combined),
      );
      return finalColor;
    })();

    this.material.positionNode = positionNode;
    this.material.colorNode = colorNode;
  }

  private updateUniforms() {
    // this.uniforms.uColor.value = new THREE.Color(this.gui.params.uColor);
    // this.uniforms.uFrequency.value = this.gui.params.uFrequency;
    // this.uniforms.uSecondFrequency.value = this.gui.params.uSecondFrequency;
    // this.uniforms.uTimeFactor.value = this.gui.params.uTimeFactor;
    // this.uniforms.uPixelSize.value = this.gui.params.uPixelSize;
  }

  public update() {
    this.position.x -= this.controls.scrollOffset * 0.001;
    let vIndex = this.index - this.controls.scrollOffset;
    vIndex = mod(vIndex, this.planeCount);
    const relativeIndex = vIndex - Math.floor(this.planeCount / 2);
    const x = relativeIndex * this.gap + relativeIndex * 1;
    this.position.x = x;

    this.uniforms.uScrollSpeed.value = this.controls.wheelDeltaY;
  }

  public destroy() {
    this.geometry.dispose();
    this.material.dispose();
    //this.gui.off("update");
  }
}
