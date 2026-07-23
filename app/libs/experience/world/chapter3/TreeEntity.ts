import { float, mrt } from "three/tsl";
import * as THREE from "three/webgpu";
import Experience from "../../Experience";
import type Raycaster from "../../utils/Raycaster";
import type SoundManager from "../../utils/SoundManager";
import type Controls from "../../utils/Controls";
import type Chapter3Scene from "../../scenes/Chapter3Scene";


type EyeData = {
  mesh: THREE.Mesh;
  baseQuaternion: THREE.Quaternion;
  basePosition: THREE.Vector3;
};

type TreeInstance = {
  id: string;
  body: THREE.Mesh;
  eyes: EyeData[];
  isCompleted: boolean;
  currentScale: number;
  hintTimer: number;
  isHinting: boolean;
  blinkTimer: number;
  blinkProgress: number;
  isBlinking: boolean;
  openSoundPlayed: boolean;
};

export default class TreeEntity {
  private trees: TreeInstance[] = [];
  private blockingTrees: THREE.Mesh[] = [];
  private experience: Experience;
  private raycaster: Raycaster;
  private camera: THREE.PerspectiveCamera;
  private raycasterMouse = new THREE.Raycaster();
  private soundManager: SoundManager;
  private controls: Controls;

  private chapter3: Chapter3Scene;

  private _onClick: (() => void) | null = null;

  constructor(
    raycaster: Raycaster,
    camera: THREE.PerspectiveCamera,
    model: THREE.Object3D,
    chapter3: Chapter3Scene,
    onClick?: () => void,
  ) {
    const { controls, soundManager } = Experience.getInstance();
    this.experience = Experience.getInstance();
    this.raycaster = raycaster;
    this.camera = camera;
    this._onClick = onClick ?? null;
    this.chapter3 = chapter3;
    this.controls = controls;
    this.soundManager = soundManager;

    this.collectMeshes(model);
    this.setupMaterials();
    this.setupClick();
  }

  private collectMeshes(model: THREE.Object3D) {
    const tempTrees: THREE.Mesh[] = [];
    const tempEyes: THREE.Mesh[] = [];

    model.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      
      const name = obj.name.toLowerCase();
      if (name.includes("tree")) {
        this.blockingTrees.push(obj as THREE.Mesh);
        
        if (name.includes("tree-group")) {
          tempTrees.push(obj as THREE.Mesh);
        }
      }
      if (name.includes("eye")) {
        (obj as THREE.Mesh).scale.setScalar(0);
        tempEyes.push(obj as THREE.Mesh);
      }
    });


    for (const treeMesh of tempTrees) {
      const treeId = treeMesh.name.match(/\d+/)?.[0];
      
      if (!treeId) continue;

      const treeInstance: TreeInstance = {
        id: treeId,
        body: treeMesh,
        eyes: [],
        isCompleted: false,
        currentScale: 0,
        hintTimer: 1 + Math.random() * 4,
        isHinting: false,
        blinkTimer: Math.random() * 3,
        blinkProgress: 0,
        isBlinking: false,
        openSoundPlayed: false,
      };

      for (const eyeMesh of tempEyes) {
        const eyeId = eyeMesh.name.match(/\d+/)?.[0];

        if (eyeId === treeId) {
          treeInstance.eyes.push({
            mesh: eyeMesh,
            baseQuaternion: eyeMesh.quaternion.clone(),
            basePosition: eyeMesh.position.clone(),
          });
        }
      }
      this.trees.push(treeInstance);
    }
  }


  private setupMaterials() {
    for (const tree of this.trees) {
      const treeMat = tree.body.material as THREE.MeshStandardNodeMaterial;
      treeMat.shadowSide = THREE.DoubleSide;

      tree.body.customDepthMaterial = new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
      });

      for (const eye of tree.eyes) {
        const baseMat = eye.mesh.material as THREE.MeshStandardNodeMaterial;
        const mat = baseMat.clone();
        mat.alphaTestNode = float(0.5);
        mat.mrtNode = mrt({ bloomIntensity: float(35) });
        eye.mesh.material = mat;
      }
    }
  }
  

  private setupClick() {
    this.experience.controls.on("click", () => {
      const allBodies = this.trees.map((t) => t.body);
      this.raycasterMouse.setFromCamera(this.experience.controls.normalizedMouse, this.camera);
      
      const intersects = this.raycasterMouse.intersectObjects(this.blockingTrees, true);

      if (intersects.length > 0) {
        const clickedObject = intersects[0]?.object;

        const tree = this.trees.find((t) => {
          let isMatch = false;
          clickedObject?.traverseAncestors((ancestor) => {
            if (ancestor === t.body) isMatch = true;
          });
          return t.body === clickedObject || isMatch;
        });

        if (tree && !tree.isCompleted) {
          tree.isCompleted = true;
          this._onClick?.();
          this.soundManager.play("s3tree");
          this.playNervsProgress();
          this.chapter3.interact();
        }
      }
    });
  }


  public getCompletedCount(): number {
    return this.trees.filter(t => t.isCompleted).length;
  }

  public getTotalCount(): number {
    return this.trees.length;
  }


  // play sounds
  private playNervsProgress() {
    const semitoneStep = 1;
    const semitones = (this.getCompletedCount() - 1) * semitoneStep;
    const clamped = Math.max(-12, Math.min(12, semitones));
    const rate = Math.pow(2, clamped / 12);
    this.soundManager.playRate("s3nerv", rate);
  }

  private playBlink() {
    const notes = [-5, -3, 0, 2, 4, 7, 9];
    const semitones = notes[Math.floor(Math.random() * notes.length)]!;
    const rate = Math.pow(2, semitones / 12);
    this.soundManager.playRate("s3blink", rate);
  }



  update() {
    const delta = this.experience.time.delta / 1000;
    const mouse = this.experience.controls.normalizedMouse;
    this.raycasterMouse.setFromCamera(mouse, this.camera);

    let hoveredTreeFound = false;

    for (const tree of this.trees) {
      const allIntersects = this.raycasterMouse.intersectObjects(this.blockingTrees, true);
      if (allIntersects.length > 0) {
        const firstHit = allIntersects[0]?.object;

        const isInteractive = this.trees.some(t => {
          if (t.isCompleted) return false;
          if (firstHit === t.body) return true;
          let match = false;
          firstHit?.traverseAncestors(a => { if(a === t.body) match = true; });
          return match;
        });

        if (isInteractive) hoveredTreeFound = true;
      }

      if (!tree.isCompleted) {
        tree.hintTimer -= delta;

        if (tree.hintTimer <= 0) {
          tree.isHinting = !tree.isHinting;

          if (tree.isHinting) {
            tree.hintTimer = 0.5;
            
          } else {
            tree.hintTimer = 2 + Math.random() * 3;
            this.playBlink();
          }
        }
      }

      let targetScale = 0;
      if (tree.isCompleted) {
        targetScale = 1;
      } else if (tree.isHinting) {
        targetScale = 1; 
      }

      const lerpSpeed = tree.isCompleted ? 4 : 10; 
      tree.currentScale = THREE.MathUtils.lerp(tree.currentScale, targetScale, delta * lerpSpeed);

      // clignements au niveau du tree (une fois pour tous les yeux)
      if (tree.currentScale > 0.1) {
        tree.blinkTimer -= delta;
        if (tree.blinkTimer <= 0 && !tree.isBlinking) {
          tree.isBlinking = true;
          tree.blinkProgress = 0;
          tree.openSoundPlayed = false;
          tree.blinkTimer = 4 + Math.random() * 10;
        }
        if (tree.isBlinking) {
          tree.blinkProgress += delta * 1.5;
          if (tree.blinkProgress >= 0.3 && !tree.openSoundPlayed) {
            tree.openSoundPlayed = true;
            this.playBlink();
          }
          if (tree.blinkProgress >= 1) {
            tree.blinkProgress = 1;
            tree.isBlinking = false;
          }
        }
      }

      const blinkEffect = tree.isBlinking
        ? (tree.blinkProgress < 0.3 ? 1 - tree.blinkProgress / 0.3 : (tree.blinkProgress - 0.3) / 0.7)
        : 1;

      for (const eye of tree.eyes) {
        const { mesh, baseQuaternion, basePosition } = eye;

        //lookat eyes
        const eyeWorldPos = new THREE.Vector3();
        mesh.getWorldPosition(eyeWorldPos);
        const eyePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -eyeWorldPos.z);
        const mouseWorld = new THREE.Vector3();
        this.raycasterMouse.ray.intersectPlane(eyePlane, mouseWorld);

        const toMouse = new THREE.Vector2(mouseWorld.x - eyeWorldPos.x, mouseWorld.y - eyeWorldPos.y);
        const dir = toMouse.divideScalar(Math.max(toMouse.length(), 0.5));
        
        const lerpFactor = 1 - Math.pow(0.02, delta);
        mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, basePosition.x + dir.x * 0.03, lerpFactor);
        mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, basePosition.y + dir.y * 0.03, lerpFactor);

        const verticalScale = Math.max(0.001, tree.currentScale * blinkEffect);
        mesh.scale.set(1, verticalScale, 1);
        mesh.quaternion.copy(baseQuaternion);
      }
    }

    if (hoveredTreeFound) {
      this.controls.setCursor("hover");
    } else {
      this.controls.setCursor("base");
    }
  }

  destroy() {}
}