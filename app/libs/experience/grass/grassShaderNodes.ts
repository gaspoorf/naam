import { float, mix, uniform, vec3 } from "three/tsl";
import * as THREE from "three/webgpu";
import { perlinNoise3d } from "../tsl/perlinNoise3d";
import { quintic } from "../tsl/quintic";

/**
 */
export interface GrassPalette {
  colorA?: string | THREE.Color;
  colorB?: string | THREE.Color;
  colorC?: string | THREE.Color;
  colorD?: string | THREE.Color;
  noiseScale?: number;
  noiseScale2?: number;
  blendStrength?: number;
}

const _toColor = (v: string | THREE.Color | undefined, def: THREE.Color) =>
  v === undefined
    ? def.clone()
    : v instanceof THREE.Color
      ? v.clone()
      : new THREE.Color(v);

/** Creates an independent set of color uniforms for one Grass instance. */
export function makeGrassUniforms(p: GrassPalette = {}) {
  return {
    colorA: uniform(_toColor(p.colorA, new THREE.Color(0.012, 0.055, 0.035))),
    colorB: uniform(_toColor(p.colorB, new THREE.Color(0.002, 0.01, 0.018))),
    noiseScale: uniform(p.noiseScale ?? 0.45),
    colorC: uniform(_toColor(p.colorC, new THREE.Color(0.03, 0.09, 0.05))),
    colorD: uniform(_toColor(p.colorD, new THREE.Color(0.008, 0.025, 0.04))),
    noiseScale2: uniform(p.noiseScale2 ?? 2.2),
    blendStrength: uniform(p.blendStrength ?? 0.55),
  };
}

export type GrassColorUniforms = ReturnType<typeof makeGrassUniforms>;

/**
 * Two stacked perlin layers — world-space XZ, continuous across tiles.
 * Pass per-instance uniforms created with makeGrassUniforms().
 */
export function groundColorNode(
  worldX: ReturnType<typeof float>,
  worldZ: ReturnType<typeof float>,
  u: GrassColorUniforms,
) {
  const {
    colorA,
    colorB,
    noiseScale,
    colorC,
    colorD,
    noiseScale2,
    blendStrength,
  } = u;

  const n1 = perlinNoise3d({
    P: vec3(worldX.mul(noiseScale), float(0.0), worldZ.mul(noiseScale)),
  })
    .mul(0.5)
    .add(0.5);
  const layer1 = mix(colorA, colorB, quintic(n1));

  const n2 = perlinNoise3d({
    P: vec3(
      worldX.mul(noiseScale2).add(float(31.7)),
      float(0.0),
      worldZ.mul(noiseScale2).add(float(17.3)),
    ),
  })
    .mul(0.5)
    .add(0.5);
  const layer2 = mix(colorC, colorD, quintic(n2));

  return mix(layer1, layer2, blendStrength);
}
