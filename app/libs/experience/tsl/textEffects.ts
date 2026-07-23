import {
  add,
  clamp,
  cos,
  div,
  float,
  floor,
  fwidth,
  max,
  min,
  positionLocal,
  positionWorld,
  sin,
  time,
  uv,
  vec2,
  vec3,
} from "three/tsl";
import * as THREE from "three/webgpu";
import { perlinNoise3d } from "./perlinNoise3d";

// ─── Effects ────────────────────────────────────────────────────────────────

export const boilingLines = (
  fontAtlas: THREE.Texture,
  noiseTexture: THREE.Texture<HTMLImageElement>,
  { fps = 6, strength = 0.5, scale = 1 } = {},
) => {
  const fontAtlasNode = new THREE.TextureNode(fontAtlas);
  const noiseTextureNode = new THREE.TextureNode(noiseTexture);
  const offsetMultiplier = vec2(Math.PI, Math.E);

  const noiseUV = positionLocal.xy
    .sub(positionWorld.xy)
    .div(vec2(noiseTexture.image.width, noiseTexture.image.height).mul(scale));

  const noiseOffset = vec2(floor(time.mul(fps))).mul(offsetMultiplier);

  const noiseSample = noiseTextureNode
    .sample(noiseUV.add(noiseOffset).mod(1).xy)
    .r.mul(4 * Math.PI);

  const direction = vec2(cos(noiseSample), sin(noiseSample));
  const squiggleSample = fontAtlasNode.sample(
    uv().add(direction.mul(strength * 0.005)),
  );

  const median = (
    r: THREE.Node<"float">,
    g: THREE.Node<"float">,
    b: THREE.Node<"float">,
  ) => max(min(r, g), min(max(r, g), b));

  const sigDist = median(
    squiggleSample.r,
    squiggleSample.g,
    squiggleSample.b,
  ).sub(0.5);

  return clamp(add(div(sigDist, fwidth(sigDist)), 0.5), float(0.0), float(1.0));
};

export const perlinReveal = (uProgress: THREE.UniformNode<"float", number>) => {
  const noiseInput = vec3(
    positionWorld.x.mul(5),
    positionWorld.y.mul(5),
    time.mul(0.1),
  );

  const n = perlinNoise3d({ P: noiseInput })
    .mul(0.2)
    .add(perlinNoise3d({ P: noiseInput.mul(2.5) }).mul(0.3))
    .mul(0.5)
    .add(0.5);

  return n.lessThan(uProgress).select(float(1.0), float(0.0));
};

export const perlinRevealFromCenter = (
  uProgress: THREE.UniformNode<"float", number>,
) => {
  const uvNode = uv();
  const center = vec2(0.5, 0.5);
  const radialDist = uvNode.sub(center).length().add(uProgress);

  const noiseInput = vec3(uvNode.x.mul(20), uvNode.y.mul(20), time.mul(0.1));

  const n = perlinNoise3d({ P: noiseInput })
    .mul(0.2)
    .add(perlinNoise3d({ P: noiseInput.mul(2.5) }).mul(0.3))
    .mul(0.5)
    .add(0.5)
    .mul(radialDist);

  return n.lessThan(uProgress).select(float(1.0), float(0.0));
};
