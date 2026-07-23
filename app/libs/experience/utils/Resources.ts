import { type GLTF, GLTFLoader } from "three/examples/jsm/Addons.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import {
  type Font,
  FontLoader,
} from "three/examples/jsm/loaders/FontLoader.js";
import * as THREE from "three/webgpu";

import type { Source } from "~/types/sources";
import { EventEmitter } from "./EventEmitter";

export default class Resources extends EventEmitter {
  declare sources: Source[];
  declare items: {
    [key: string]:
      | GLTF
      | THREE.Texture
      | THREE.CubeTexture
      | Font
      | THREE.Group;
  };
  declare toLoad: number;
  declare loaded: number;
  declare loaders: {
    gltfLoader?: GLTFLoader;
    textureLoader?: THREE.TextureLoader;
    cubeTextureLoader?: THREE.CubeTextureLoader;
    fontLoader?: FontLoader;
    fbxLoader?: FBXLoader;
  };

  constructor(sources: Source[]) {
    super();

    // Options
    this.sources = sources;
    this.items = {};
    this.toLoad = this.sources.length;
    this.loaded = 0;

    this.setLoaders();
    this.startLoading();
  }

  setLoaders() {
    this.loaders = {};
    const draco = new DRACOLoader();
    draco.setDecoderPath("/draco/");
    this.loaders.gltfLoader = new GLTFLoader();
    this.loaders.gltfLoader.setDRACOLoader(draco);
    this.loaders.textureLoader = new THREE.TextureLoader();
    this.loaders.cubeTextureLoader = new THREE.CubeTextureLoader();
    this.loaders.fontLoader = new FontLoader();
    this.loaders.fbxLoader = new FBXLoader();
  }

  startLoading() {
    for (const source of this.sources) {
      if (source.type === "gltfModel" && this.loaders.gltfLoader) {
        this.loaders.gltfLoader.load(source.path, (file) => {
          this.sourceLoaded(source, file);
        });
      } else if (source.type === "texture" && this.loaders.textureLoader) {
        this.loaders.textureLoader.load(source.path, (file) => {
          this.sourceLoaded(source, file);
        });
      } else if (
        source.type === "cubeTexture" &&
        this.loaders.cubeTextureLoader
      ) {
        this.loaders.cubeTextureLoader.load(source.path, (file) => {
          this.sourceLoaded(source, file);
        });
      } else if (source.type === "font" && this.loaders.fontLoader) {
        this.loaders.fontLoader.load(source.path, (file) => {
          this.sourceLoaded(source, file);
        });
      } else if (source.type === "fbx" && this.loaders.fbxLoader) {
        this.loaders.fbxLoader.load(source.path, (file) => {
          this.sourceLoaded(source, file);
        });
      }
    }
  }

  sourceLoaded(
    source: Source,
    file: GLTF | THREE.Texture | THREE.CubeTexture | Font | THREE.Group,
  ) {
    if (file instanceof THREE.Texture) {
      file.colorSpace = THREE.SRGBColorSpace;
    }
    this.items[source.name] = file;
    this.loaded++;

    this.trigger("progress", [{ value: this.loaded / this.toLoad }]);

    if (this.loaded === this.toLoad) {
      this.trigger("ready");
    }
  }
}
