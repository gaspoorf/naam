import {
  color,
  float,
  hash,
  mrt,
  select,
  sin,
  smoothstep,
  texture,
  time,
  uniform,
  uv,
  vec2,
} from "three/tsl";
import * as THREE from "three/webgpu";
import { COLORS } from "~/constants";
import Experience from "../../Experience";
import UIScene from "../../scenes/UIScene";


export default class NervEntity {
    private experience: Experience;
    private uiScene: UIScene;
    private nervMesh: THREE.Mesh | null = null;

    private progress = uniform(float(0));
    private targetProgress = 0;

    private sparkleProgress = uniform(float(0));
    private sparkleStarted = false;
    public hideStarted = false;
    private hideProgress = uniform(float(0));
    private hideDelay = 0;
    private hideTimer = 0;
    private isNext = false;

    constructor(model: THREE.Object3D) {
        this.experience = Experience.getInstance();
        this.uiScene = this.experience.sceneManager.uiScene;
        this.collectMesh(model);
        this.setupMaterial();
    }

    private collectMesh(model: THREE.Object3D) {
        model.traverse((obj) => {
            if (!(obj as THREE.Mesh).isMesh) return;
            if (obj.name.toLowerCase().includes("nerv")) {
                this.nervMesh = obj as THREE.Mesh;
            }
        });
    }

    private setupMaterial() {
        if (!this.nervMesh) return;

        const baseMat = this.nervMesh.material as THREE.MeshStandardNodeMaterial;
        const mat = baseMat.clone();

        const noisyDist = uv().distance(vec2(0.5, 0.5)).add(hash(uv().mul(15.0)).mul(0.15));

        //reveal
        const threshold = float(1.1).sub(this.progress.mul(1.1));
        const opacityMask = select(noisyDist.greaterThan(threshold), float(1.0), float(0.0));
        const edge = smoothstep(threshold, threshold.add(0.05), noisyDist).mul(opacityMask.oneMinus());

        //scintillement
        const sparkleThreshold = float(1.1).sub(this.sparkleProgress.mul(1.1));
        const sparkleArea = select(noisyDist.greaterThan(sparkleThreshold), float(1.0), float(0.0)).mul(opacityMask);
        const sparkleEdge = smoothstep(sparkleThreshold, sparkleThreshold.add(0.06), noisyDist).mul(sparkleArea.oneMinus()).mul(opacityMask);
        
        const travelWave = sin(time.mul(3.5).sub(noisyDist.mul(18.0))).mul(0.5).add(0.5).pow(2);
        const globalBeat = sin(time.mul(1.6)).mul(0.5).add(0.5).pow(3);
        const scintillate = travelWave.mul(0.7).add(globalBeat.mul(0.3));

        // transition settled
        const settled = smoothstep(float(0.82), float(0.97), this.sparkleProgress);
        const activeSparkle = scintillate.mul(sparkleArea).mul(6.0).mul(this.hideProgress.oneMinus());
        const activeBurst = sparkleEdge.mul(18.0).mul(this.hideProgress.oneMinus());

        mat.colorNode = mat.map ? texture(mat.map) : color(0xffffff);

        // mat final
        mat.colorNode = mat.map ? texture(mat.map) : color(0xffffff);
        mat.emissiveNode = color(COLORS.entityBlueColor).mul(
            opacityMask.mul(2).add(edge.mul(15)).add(activeSparkle).add(activeBurst).add(sparkleArea.mul(settled).mul(0.1))
        );
        mat.opacityNode = opacityMask;
        mat.alphaTestNode = float(0.01);
        mat.transparent = true;
        
        mat.mrtNode = mrt({
            bloomIntensity: opacityMask.mul(settled.oneMinus().mul(0.6).add(settled.mul(0.12))).add(edge.mul(8.0)).add(activeSparkle.mul(0.3)).add(activeBurst.mul(0.3))
        });

        this.nervMesh.material = mat;
    }
    

    public get sparkleProgressValue() {
        return this.sparkleProgress.value;
    }

    public setProgress(value: number) {
        this.targetProgress = value;
    }

    update() {
        const delta = this.experience.time.delta / 1000;

        // arrivée
        if (!this.hideStarted) {
            this.progress.value = THREE.MathUtils.lerp(
                this.progress.value,
                this.targetProgress,
                delta * 2.0
            );
        }

        if (this.targetProgress >= 1.0 && !this.sparkleStarted) {
            this.sparkleStarted = true;
            this.hideTimer = 0;
        }

        //scintillement
        if (this.sparkleStarted) {
            this.sparkleProgress.value = THREE.MathUtils.lerp(
                this.sparkleProgress.value,
                1.0,
                delta * 0.6 
            );

            if (Math.abs(this.sparkleProgress.value - 1.0) < 0.05) {
                this.hideTimer += delta;
                if (this.hideTimer > this.hideDelay) {
                    this.hideStarted = true;
                    this.hideTimer = 0;
                }
            }
        }


        // disparition
        if (this.hideStarted) {
            this.hideProgress.value = THREE.MathUtils.lerp(
                this.hideProgress.value,
                1.0,
                delta * 0.25
            );
            this.progress.value = 1.0 - this.hideProgress.value;

            
            if (this.hideProgress.value > 0.6 && !this.isNext) {
                this.uiScene.setNext(true);
                this.isNext = true;
            }
        }


    }

    destroy() {}
}
