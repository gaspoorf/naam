export type TextureSource = {
  name: string;
  type: "texture";
  path: string;
};

export type CubeTextureSource = {
  name: string;
  type: "cubeTexture";
  path: string[];
};

export type GLTFModelSource = {
  name: string;
  type: "gltfModel";
  path: string;
};

export type FontSource = {
  name: string;
  type: 'font';
  path: string;
};

export type FBXSource = {
  name: string;
  type: 'fbx';
  path: string;
};

export type Source = TextureSource | CubeTextureSource | GLTFModelSource | FontSource | FBXSource;
