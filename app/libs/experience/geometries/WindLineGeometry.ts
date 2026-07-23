import * as THREE from "three/webgpu";
import { LineGeometry } from "./LineGeometry";

// export class WindLineGeometry extends LineGeometry {
//   override readonly type: string = "WindLineGeometry";
//   declare parameters: {
//     length: number;
//     handlesCount: number;
//     amplitude: number;
//     divisions: number;
//     points: THREE.Vector3[];
//   };

//   constructor(
//     length: number = 10,
//     handlesCount: number = 4,
//     amplitude: number = 1,
//     divisions: number = 30,
//   ) {
//     const halfExtent = length / 2;
//     const handleSpan = length / (handlesCount - 1);
//     const handles: THREE.Vector3[] = [];

//     for (let i = 0; i < handlesCount; i++) {
//       handles.push(
//         new THREE.Vector3(
//           0,
//           ((i % 2) - 0.5) * amplitude,
//           -halfExtent + i * handleSpan,
//         ),
//       );
//     }

//     const curve = new THREE.CatmullRomCurve3(handles);
//     const points = curve.getPoints(divisions);

//     super(points);

//     this.parameters = { length, handlesCount, amplitude, divisions, points };
//   }
// }

export class WindLineGeometry extends LineGeometry {
  override readonly type: string = "WindLineGeometry";
  declare parameters: {
    length: number;
    handlesCount: number;
    amplitude: number;
    divisions: number;
    points: THREE.Vector3[];
  };

  constructor(
    length: number = 10,
    handlesCount: number = 4,
    amplitude: number = 1,
    divisions: number = 30,
  ) {
    const halfExtent = length / 2;
    const handleSpan = length / (handlesCount - 1);
    const handles: THREE.Vector3[] = [];

    for (let i = 0; i < handlesCount; i++) {
      handles.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * amplitude,
          (Math.random() - 0.5) * amplitude,
          -halfExtent + i * handleSpan,
        ),
      );
    }

    const curve = new THREE.CatmullRomCurve3(handles);
    const points = curve.getPoints(divisions);

    super(points);

    this.parameters = { length, handlesCount, amplitude, divisions, points };
  }
}
