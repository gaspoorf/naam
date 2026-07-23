import * as THREE from "three/webgpu";

export default class Floor extends THREE.Group {
  public meshes: THREE.Mesh[] = [];

  constructor(base: THREE.Object3D) {
    super();

    this.name = "floor";
    this.position.copy(base.position);
    this.quaternion.copy(base.quaternion);
    this.scale.copy(base.scale);

    base.children.slice().forEach((child) => {
      if (child instanceof THREE.Mesh) {
        const mesh = child.clone();
        this.meshes.push(mesh);
        this.add(mesh);
      }
    });
  }

  public setMaterial(material: THREE.Material): void {
    this.meshes.forEach((mesh) => {
      mesh.material = material;
    });
  }

  public updateMaterial(
    callback: (mat: THREE.MeshStandardMaterial) => void,
  ): void {
    this.meshes.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      callback(mat);
      mat.needsUpdate = true;
    });
  }

  public get floorMeshes(): THREE.Mesh[] {
    return this.meshes;
  }
}
