import * as THREE from "three/webgpu";
import Experience from "../Experience";
import type { ColorSample, NormalSample } from "./GrassTrianglesField";
import GrassTrianglesField from "./GrassTrianglesField";
import GreenPlane from "./GreenPlane";
import type { GrassPalette } from "./grassShaderNodes";
import { makeGrassUniforms } from "./grassShaderNodes";

export interface GrassOptions {
  count?: number;
  areaSize?: number;
  height?: number;
  width?: number;
  planeColor?: string;
  grassColor?: string;
  heightSampler?: (x: number, z: number) => number;
  normalSampler?: (x: number, z: number) => NormalSample;
  isExcluded?: (x: number, z: number) => boolean;
  /**
   * When provided, blade color is sampled from the surface.
   * When omitted, uses groundColorNode — same as GreenPlane, colours always match.
   */
  colorSampler?: (x: number, z: number) => ColorSample;
  /** Set false to skip adding the green ground plane. Default true. */
  showPlane?: boolean;
  /** Noise-based color palette. Independent per Grass instance. */
  palette?: GrassPalette;
  /**
   * Circular spawn radius per tile in world units.
   * Blades beyond this distance from the tile center are hidden.
   * Useful to avoid sharp square edges. Default: full tile (no limit).
   */
  spawnRadius?: number;
  refMeshes?: THREE.Mesh[];
}

interface Tile {
  plane: GreenPlane;
  field: GrassTrianglesField;
  gx: number;
  gz: number;
}

export default class Grass {
  private scene: THREE.Scene;
  private tiles: Tile[] = [];
  private tileSize = 8;
  private centerGx = 0;
  private centerGz = 0;
  private heightSampler?: (x: number, z: number) => number;
  private normalSampler?: (x: number, z: number) => NormalSample;
  private isExcluded?: (x: number, z: number) => boolean;
  public colorUniforms: ReturnType<typeof makeGrassUniforms>;

  constructor(scene: THREE.Scene, options: GrassOptions = {}) {
    this.scene = scene;

    const {
      count = 10,
      areaSize = 8,
      height = 0.35,
      width = 0.11,
      planeColor = "#3c4c47",
      grassColor = "#5b736b",
      // heightSampler,
      // normalSampler,
      // isExcluded,
      colorSampler,
      showPlane = true,
      palette,
      spawnRadius,
      refMeshes,
    } = options;

    this.tileSize = areaSize;
    // this.heightSampler = heightSampler;
    const perTile = Math.ceil(count / 9);

    if (refMeshes) {
      const GRID_RES = 128;
      const GRID_HALF = 32;
      const cellSize = (GRID_HALF * 2) / GRID_RES;

      const gridY = new Float32Array(GRID_RES * GRID_RES);
      const gridNX = new Float32Array(GRID_RES * GRID_RES);
      const gridNY = new Float32Array(GRID_RES * GRID_RES);
      const gridNZ = new Float32Array(GRID_RES * GRID_RES);
      const gridHit = new Uint8Array(GRID_RES * GRID_RES);

      const raycaster = new THREE.Raycaster();
      const origin = new THREE.Vector3();
      const down = new THREE.Vector3(0, -1, 0);
      const normalMatrix = new THREE.Matrix3();

      for (let gz = 0; gz < GRID_RES; gz++) {
        for (let gx = 0; gx < GRID_RES; gx++) {
          const wx = -GRID_HALF + (gx + 0.5) * cellSize;
          const wz = -GRID_HALF + (gz + 0.5) * cellSize;
          origin.set(wx, 100, wz);
          raycaster.set(origin, down);
          const hits = raycaster.intersectObjects(refMeshes, false);
          const idx = gz * GRID_RES + gx;
          if (hits.length > 0) {
            gridY[idx] = hits[0]!.point.y;
            gridHit[idx] = 1;
            if (hits[0]!.face) {
              normalMatrix.getNormalMatrix(hits[0]!.object.matrixWorld);
              const n = hits[0]!.face.normal
                .clone()
                .applyMatrix3(normalMatrix)
                .normalize();
              gridNX[idx] = n.x;
              gridNY[idx] = n.y;
              gridNZ[idx] = n.z;
            } else {
              gridNY[idx] = 1;
            }
          } else {
            gridY[idx] = -1000;
            gridNY[idx] = 1;
          }
        }
      }

      // Bilinear interpolation helpers — avoids staircase lines on slopes
      const clampG = (v: number) => Math.min(GRID_RES - 1, Math.max(0, v));

      const bilerp = (arr: Float32Array, x: number, z: number): number => {
        const fx = (x + GRID_HALF) / cellSize - 0.5;
        const fz = (z + GRID_HALF) / cellSize - 0.5;
        const x0 = clampG(Math.floor(fx));
        const x1 = clampG(x0 + 1);
        const z0 = clampG(Math.floor(fz));
        const z1 = clampG(z0 + 1);
        const tx = fx - Math.floor(fx);
        const tz = fz - Math.floor(fz);
        const v00 = arr[z0 * GRID_RES + x0]!;
        const v10 = arr[z0 * GRID_RES + x1]!;
        const v01 = arr[z1 * GRID_RES + x0]!;
        const v11 = arr[z1 * GRID_RES + x1]!;
        return v00 * (1 - tx) * (1 - tz) +
               v10 * tx * (1 - tz) +
               v01 * (1 - tx) * tz +
               v11 * tx * tz;
      };

      const lookupHit = (x: number, z: number): boolean => {
        const gx = clampG(((x + GRID_HALF) / cellSize) | 0);
        const gz = clampG(((z + GRID_HALF) / cellSize) | 0);
        return gridHit[gz * GRID_RES + gx] === 0;
      };

      this.heightSampler = (x: number, z: number): number =>
        bilerp(gridY, x, z);
      this.normalSampler = (x: number, z: number) => ({
        nx: bilerp(gridNX, x, z),
        ny: bilerp(gridNY, x, z),
        nz: bilerp(gridNZ, x, z),
      });
      this.isExcluded = (x: number, z: number): boolean =>
        lookupHit(x, z);
    }

    // One independent uniform set per Grass instance — scenes don't share colors.
    const colorUniforms = makeGrassUniforms(palette);
    this.colorUniforms = colorUniforms;

    const { resources } = Experience.getInstance();

    const groundMap = resources.items["testGrass"] as THREE.Texture | undefined;
    const bladeMap = resources.items["bladeTexture"] as
      | THREE.Texture
      | undefined;

    for (let gz = -1; gz <= 1; gz++) {
      for (let gx = -1; gx <= 1; gx++) {
        const plane = new GreenPlane(areaSize, colorUniforms);
        plane.setColor(planeColor);
        if (showPlane) scene.add(plane);

        const field = new GrassTrianglesField({
          count: perTile,
          areaSize,
          height,
          width,
          heightSampler: this.heightSampler,
          normalSampler: this.normalSampler,
          isExcluded: this.isExcluded,
          colorSampler,
          colorUniforms,
          spawnRadius,
        });
        field.setColor(grassColor);
        scene.add(field);

        if (groundMap) {
          plane.setTexture(groundMap);
          field.setGroundTexture(groundMap);
        }
        if (bladeMap) {
          field.setBladeTex(bladeMap);
        }

        const tile: Tile = { plane, field, gx, gz };
        this.tiles.push(tile);
        this._placeTile(tile);
      }
    }
  }

  private _placeTile(tile: Tile) {
    const wx = tile.gx * this.tileSize;
    const wz = tile.gz * this.tileSize;
    const wy = this.heightSampler ? this.heightSampler(wx, wz) : 0;
    tile.plane.position.set(wx, wy, wz);
    tile.plane.updateMatrixWorld(true);
    tile.field.position.set(wx, 0, wz);
    tile.field.updateMatrixWorld(true);
    tile.field.setTileOffset(wx, wz);
  }

  public update(
    delta: number,
    camera: { position: { x: number; z: number } },
    anchor?: { x: number; z: number },
  ) {
    const ax = anchor?.x ?? camera.position.x;
    const az = anchor?.z ?? camera.position.z;

    const newGx = Math.round(ax / this.tileSize);
    const newGz = Math.round(az / this.tileSize);

    if (newGx !== this.centerGx || newGz !== this.centerGz) {
      this.centerGx = newGx;
      this.centerGz = newGz;

      for (const tile of this.tiles) {
        let relX = tile.gx - newGx;
        let relZ = tile.gz - newGz;
        if (relX < -1) relX += 3;
        else if (relX > 1) relX -= 3;
        if (relZ < -1) relZ += 3;
        else if (relZ > 1) relZ -= 3;

        const newGx_ = newGx + relX;
        const newGz_ = newGz + relZ;
        if (newGx_ !== tile.gx || newGz_ !== tile.gz) {
          tile.gx = newGx_;
          tile.gz = newGz_;
          this._placeTile(tile);
        }
      }
    }

    for (const { field } of this.tiles)
      field.update(delta, camera, { x: ax, z: az });
  }

  public setBladeTex(map: THREE.Texture) {
    this.tiles.forEach(({ field }) => field.setBladeTex(map));
  }

  public loadBladeTex(url: string) {
    new THREE.TextureLoader().load(url, (map) => this.setBladeTex(map));
  }

  public destroy() {
    for (const { plane, field } of this.tiles) {
      this.scene.remove(plane);
      this.scene.remove(field);
      plane.destroy();
      field.destroy();
    }
    this.tiles = [];
  }
}
