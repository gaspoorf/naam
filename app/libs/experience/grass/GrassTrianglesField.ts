import {
  attribute,
  clamp,
  float,
  floor,
  Fn,
  mod,
  positionLocal,
  sin,
  sqrt,
  texture,
  time,
  uniform,
  uv,
  varying,
  vec2,
  vec4,
} from "three/tsl";
import * as THREE from "three/webgpu";
import { quintic } from "../tsl/quintic";
import type { GrassColorUniforms } from "./grassShaderNodes";
import { groundColorNode } from "./grassShaderNodes";

export type NormalSample = { nx: number; ny: number; nz: number };
export type ColorSample = { r: number; g: number; b: number };

export type GrassTrianglesFieldOptions = {
  count?: number;
  areaSize?: number;
  height?: number;
  width?: number;
  heightSampler?: (x: number, z: number) => number;
  normalSampler?: (x: number, z: number) => NormalSample;
  isExcluded?: (x: number, z: number) => boolean;
  colorSampler?: (x: number, z: number) => ColorSample;
  /** Per-instance color uniforms created with makeGrassUniforms(). */
  colorUniforms: GrassColorUniforms;
  spawnRadius?: number;
};

export default class GrassTrianglesField extends THREE.InstancedMesh {
  private bladeTextureNode: any;
  private u!: Record<string, ReturnType<typeof uniform>>;

  private instXArr!: Float32Array;
  private instZArr!: Float32Array;
  private instNXArr!: Float32Array;
  private instNZArr!: Float32Array;
  private instColorArr!: Float32Array;

  private _heightFn: ((x: number, z: number) => number) | null = null;
  private _normalFn: ((x: number, z: number) => NormalSample) | null = null;
  private _excludeFn: ((x: number, z: number) => boolean) | null = null;
  private _colorFn: ((x: number, z: number) => ColorSample) | null = null;

  private _bladeW = 0;
  private _bladeH = 0;
  private _tileOffX = 0;
  private _tileOffZ = 0;
  private _spawnR2 = Infinity; // squared spawn radius, Infinity = no limit
  private readonly _tmp = new THREE.Object3D();

  constructor(options: GrassTrianglesFieldOptions) {
    const {
      count = 10,
      areaSize = 8,
      height = 0.05,
      width = 0.015,
      heightSampler,
      normalSampler,
      isExcluded,
      colorSampler,
      colorUniforms,
      spawnRadius,
    } = options;

    // ── Geometry ─────────────────────────────────────────────────────────────
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0]),
        3,
      ),
    );
    geo.setAttribute(
      "uv",
      new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2),
    );
    geo.setIndex(
      new THREE.BufferAttribute(new Uint16Array([0, 1, 2, 0, 2, 3]), 1),
    );

    const instXArr = new Float32Array(count);
    const instZArr = new Float32Array(count);
    const instNXArr = new Float32Array(count);
    const instNZArr = new Float32Array(count);
    const instColorArr = new Float32Array(count * 3); // RGB
    geo.setAttribute(
      "aInstanceX",
      new THREE.InstancedBufferAttribute(instXArr, 1),
    );
    geo.setAttribute(
      "aInstanceZ",
      new THREE.InstancedBufferAttribute(instZArr, 1),
    );
    geo.setAttribute(
      "aInstanceNX",
      new THREE.InstancedBufferAttribute(instNXArr, 1),
    );
    geo.setAttribute(
      "aInstanceNZ",
      new THREE.InstancedBufferAttribute(instNZArr, 1),
    );
    geo.setAttribute(
      "aInstanceColor",
      new THREE.InstancedBufferAttribute(instColorArr, 3),
    );

    const spriteIdxArr = new Float32Array(count);
    for (let i = 0; i < count; i++)
      spriteIdxArr[i] = Math.floor(Math.random() * 8);
    geo.setAttribute(
      "aSpriteIdx",
      new THREE.InstancedBufferAttribute(spriteIdxArr, 1),
    );

    // ── Uniforms ─────────────────────────────────────────────────────────────
    const u = {
      uBladeWidth: uniform(width),
      uWindAmp: uniform(0.02),
      uWindFreq: uniform(1.65),
      uWindSpeed: uniform(1.9),
      uAnchorX: uniform(0.0),
      uAnchorZ: uniform(0.0),
      uPushRadius: uniform(3.5),
      uPushStrength: uniform(0.2),
      uCrushRadius: uniform(0.55),
      uCamX: uniform(0.0),
      uCamZ: uniform(0.0),
      uTileOffsetX: uniform(0.0),
      uTileOffsetZ: uniform(0.0),
    };

    const instX = float(attribute("aInstanceX"));
    const instZ = float(attribute("aInstanceZ"));
    const worldX = instX.add(u.uTileOffsetX);
    const worldZ = instZ.add(u.uTileOffsetZ);

    const bladeColor = colorSampler
      ? attribute("aInstanceColor")
      : varying(groundColorNode(worldX, worldZ, colorUniforms), "vGroundColor");

    // Sprite sheet UV
    const COLS = float(4),
      ROWS = float(2);
    const col = mod(float(attribute("aSpriteIdx")), COLS);
    const row = floor(float(attribute("aSpriteIdx")).div(COLS));
    const cellW = float(1).div(COLS),
      cellH = float(1).div(ROWS);
    const margin = float(0.002);
    const cellUV = clamp(
      uv(),
      vec2(margin, margin),
      vec2(float(1).sub(margin), float(1).sub(margin)),
    );
    const spriteUV = cellUV
      .mul(vec2(cellW, cellH))
      .add(vec2(col.mul(cellW), row.mul(cellH)));

    const mat = new THREE.MeshStandardNodeMaterial();
    const bladeTextureNode = texture(
      Object.assign(
        new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1),
        { needsUpdate: true },
      ),
      spriteUV,
    );
    mat.colorNode = vec4(bladeColor, bladeTextureNode.a);
    // mat.transparent = true;
    // mat.alphaTest = 0.9;
    mat.alphaTestNode = float(0.9);
    mat.side = THREE.BackSide;

    // Wind wave
    const wind = Fn(() => {
      const t = time.mul(u.uWindSpeed);
      const x = float(attribute("aInstanceX"));
      const z = float(attribute("aInstanceZ"));
      const waveZ = sin(z.mul(u.uWindFreq).add(t));
      const waveD = sin(
        x
          .mul(u.uWindFreq.mul(0.55))
          .add(z.mul(u.uWindFreq.mul(0.35)))
          .add(t.mul(1.7)),
      );
      return waveZ.mul(0.8).add(waveD.mul(0.2));
    })();

    mat.positionNode = Fn(() => {
      const pos = positionLocal.toVar();
      const tipOnly = clamp(
        uv().y.sub(float(0.2)).div(float(0.8)),
        float(0),
        float(1),
      );
      const tip3 = tipOnly.mul(tipOnly).mul(tipOnly);

      // Wind sway
      pos.x.addAssign(
        wind.mul(u.uWindAmp.div(u.uBladeWidth.max(float(0.0001)))).mul(tip3),
      );

      // Billboard rotation toward camera
      const bx = float(attribute("aInstanceX")).add(u.uTileOffsetX);
      const bz = float(attribute("aInstanceZ")).add(u.uTileOffsetZ);
      const ddx = u.uCamX.sub(bx),
        ddz = u.uCamZ.sub(bz);
      const dlen = sqrt(ddx.mul(ddx).add(ddz.mul(ddz)).add(float(0.0001)));
      const xVal = pos.x.toVar();
      pos.x.assign(xVal.mul(ddz.negate().div(dlen)));
      pos.z.assign(xVal.mul(ddx.div(dlen)));

      // Player push + crush
      const pdx = bx.sub(u.uAnchorX),
        pdz = bz.sub(u.uAnchorZ);
      const dist = sqrt(pdx.mul(pdx).add(pdz.mul(pdz)).add(float(0.0001)));
      const lean = quintic(
        clamp(float(1).sub(dist.div(u.uPushRadius)), float(0), float(1)),
      )
        .mul(u.uPushStrength)
        .mul(tipOnly);
      pos.x.addAssign(pdx.div(dist).mul(lean));
      pos.z.addAssign(pdz.div(dist).mul(lean));
      pos.y.mulAssign(
        quintic(clamp(dist.div(u.uCrushRadius), float(0), float(1))),
      );

      // Surface normal tilt
      const nX = float(attribute("aInstanceNX"));
      const nZ = float(attribute("aInstanceNZ"));
      const nY = sqrt(
        clamp(float(1).sub(nX.mul(nX)).sub(nZ.mul(nZ)), float(0), float(1)),
      );
      const slopeX = nX.mul(ddz.negate().div(dlen)).add(nZ.mul(ddx.div(dlen)));
      const slopeZ = nX.mul(ddx.div(dlen)).add(nZ.mul(ddz.div(dlen)));
      const bladeH = pos.y.toVar();
      pos.x.addAssign(slopeX.mul(bladeH));
      pos.y.assign(nY.mul(bladeH));
      pos.z.addAssign(slopeZ.mul(bladeH));

      return pos;
    })();

    super(geo, mat, count);
    this.frustumCulled = false;
    // this.renderOrder = 2;

    this._heightFn = heightSampler ?? null;
    this._normalFn =
      normalSampler ?? (heightSampler ? _makeNormalFn(heightSampler) : null);
    this._excludeFn = isExcluded ?? null;
    this._colorFn = colorSampler ?? null;
    this._bladeW = width;
    this._bladeH = height;
    this._spawnR2 =
      spawnRadius !== undefined ? spawnRadius * spawnRadius : Infinity;
    this.instXArr = instXArr;
    this.instZArr = instZArr;
    this.instNXArr = instNXArr;
    this.instNZArr = instNZArr;
    this.instColorArr = instColorArr;

    // Jittered grid — XZ positions generated once, Y/normals/colors rebuilt on tile scroll
    const half = areaSize / 2;
    const grid = Math.ceil(Math.sqrt(count));
    const cell = areaSize / grid;
    const tot = grid * grid;
    const idx = new Uint32Array(tot);
    for (let i = 0; i < tot; i++) idx[i] = i;
    for (let i = tot - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [idx[i], idx[j]] = [idx[j]!, idx[i]!];
    }
    for (let i = 0; i < count; i++) {
      const k = idx[i] ?? i;
      instXArr[i] =
        -half + ((k % grid) + 0.5) * cell + (Math.random() - 0.5) * cell;
      instZArr[i] =
        -half + (((k / grid) | 0) + 0.5) * cell + (Math.random() - 0.5) * cell;
    }

    this._placeInstances();
    (
      geo.getAttribute("aInstanceX") as THREE.InstancedBufferAttribute
    ).needsUpdate = true;
    (
      geo.getAttribute("aInstanceZ") as THREE.InstancedBufferAttribute
    ).needsUpdate = true;

    this.bladeTextureNode = bladeTextureNode;
    this.u = u;
  }

  /** Recomputes Y, normals, and colors for the current tile world offset. */
  private _placeInstances(): void {
    const {
      instXArr,
      instZArr,
      instNXArr,
      instNZArr,
      instColorArr,
      _heightFn,
      _normalFn,
      _colorFn,
      _bladeW,
      _bladeH,
      _tileOffX,
      _tileOffZ,
      _tmp,
    } = this;
    const count = this.count;

    for (let i = 0; i < count; i++) {
      const lx = instXArr[i]!;
      const lz = instZArr[i]!;
      const wx = lx + _tileOffX;
      const wz = lz + _tileOffZ;

      if (this._excludeFn?.(wx, wz)) {
        instNXArr[i] = 0;
        instNZArr[i] = 0;
        _tmp.position.set(lx, -1000, lz);
        _tmp.scale.set(0, 0, 0);
        _tmp.updateMatrix();
        this.setMatrixAt(i, _tmp.matrix);
        continue;
      }

      // Circular spawn area: hide blades beyond spawnRadius from tile center
      if (lx * lx + lz * lz > this._spawnR2) {
        _tmp.position.set(lx, -1000, lz);
        _tmp.scale.set(0, 0, 0);
        _tmp.updateMatrix();
        this.setMatrixAt(i, _tmp.matrix);
        continue;
      }

      const y = (_heightFn ? _heightFn(wx, wz) : 0) + 0.001;

      if (_normalFn) {
        const n = _normalFn(wx, wz);
        instNXArr[i] = n.nx;
        instNZArr[i] = n.nz;
      }
      if (_colorFn) {
        const c = _colorFn(wx, wz);
        instColorArr[i * 3] = c.r;
        instColorArr[i * 3 + 1] = c.g;
        instColorArr[i * 3 + 2] = c.b;
      }

      _tmp.position.set(lx, y, lz);
      _tmp.rotation.set(0, 0, 0);
      _tmp.scale.set(_bladeW, _bladeH, _bladeW);
      _tmp.updateMatrix();
      this.setMatrixAt(i, _tmp.matrix);
    }

    this.instanceMatrix.needsUpdate = true;
    (
      this.geometry.getAttribute(
        "aInstanceNX",
      ) as THREE.InstancedBufferAttribute
    ).needsUpdate = true;
    (
      this.geometry.getAttribute(
        "aInstanceNZ",
      ) as THREE.InstancedBufferAttribute
    ).needsUpdate = true;
    if (this._colorFn)
      (
        this.geometry.getAttribute(
          "aInstanceColor",
        ) as THREE.InstancedBufferAttribute
      ).needsUpdate = true;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  public setColor(_hex: string) {
    /* color driven by groundColorNode or colorSampler */
  }
  public setGroundTexture(_map: THREE.Texture) {
    /* driven by perlin noise */
  }

  public setBladeTex(map: THREE.Texture) {
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    this.bladeTextureNode.value = map;
  }

  public setTileOffset(ox: number, oz: number) {
    this.u.uTileOffsetX!.value = ox;
    this.u.uTileOffsetZ!.value = oz;
    this._tileOffX = ox;
    this._tileOffZ = oz;
    if (this._heightFn || this._normalFn || this._excludeFn || this._colorFn)
      this._placeInstances();
  }

  public update(
    _dt: number,
    camera?: { position: { x: number; z: number } },
    anchor?: { x: number; z: number },
  ) {
    if (!camera) return;
    const cx = camera.position.x,
      cz = camera.position.z;
    const ax = anchor?.x ?? cx,
      az = anchor?.z ?? cz;
    this.u.uAnchorX!.value = ax;
    this.u.uAnchorZ!.value = az;
    this.u.uCamX!.value = cx;
    this.u.uCamZ!.value = cz;
  }

  public destroy() {
    this.geometry.dispose();
    (Array.isArray(this.material) ? this.material : [this.material]).forEach(
      (m) => m.dispose(),
    );
  }
}

/** Derives a normal sampler from a height sampler using central finite differences. */
function _makeNormalFn(h: (x: number, z: number) => number) {
  const eps = 0.1;
  return (x: number, z: number): NormalSample => {
    const dydx = (h(x + eps, z) - h(x - eps, z)) / (2 * eps);
    const dydz = (h(x, z + eps) - h(x, z - eps)) / (2 * eps);
    const len = Math.sqrt(dydx * dydx + 1 + dydz * dydz);
    return { nx: -dydx / len, ny: 1 / len, nz: -dydz / len };
  };
}
