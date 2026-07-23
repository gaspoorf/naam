import * as THREE from "three/webgpu";
import type Camera from "../../Camera";
import Experience from "../../Experience";
import Grass from "../../grass/Grass";
import type Time from "../../utils/Time";

export default class S4Floor extends THREE.Group {
  private camera: Camera;
  private time: Time;
  private floorPlane: THREE.Mesh;
  private grassPlane: THREE.Mesh;
  private grass: Grass;

  constructor(scene: THREE.Scene, camera: Camera, base: THREE.Object3D) {
    super();

    this.time = Experience.getInstance().time;
    this.camera = camera;

    base.updateWorldMatrix(true, false);
    this.applyMatrix4(base.matrixWorld);

    // FLOOR PLANE
    const floorPlaneChild = base.children.find(
      (child) => child.name.toLowerCase() === "floor-grass",
    ) as THREE.Mesh;
    if (floorPlaneChild) {
      this.floorPlane = floorPlaneChild.clone();
      this.floorPlane.material = new THREE.MeshBasicMaterial({
        color: 0x13403f,
      });
      this.add(this.floorPlane);
    } else {
      throw new Error("Floor plane mesh not found in base object");
    }

    // GRASS PLANE
    const grassPlaneChild = base.children.find(
      (child) => child.name.toLowerCase() === "floor-low-poly",
    ) as THREE.Mesh;
    if (grassPlaneChild) {
      this.grassPlane = grassPlaneChild.clone();
      this.grass = new Grass(scene, {
        count: 400000,
        areaSize: 35,
        refMeshes: [this.grassPlane],
        showPlane: false,
        height: 0.4,
      });
    } else {
      throw new Error("Grass plane mesh not found in base object");
    }
  }

  update() {
    const dt = this.time.delta / 1000;
    this.grass.update(dt, this.camera.instance);
  }

  destroy() {
    this.grass.destroy();
  }
}
