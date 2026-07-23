import { Vector2 } from "three";
import type { CursorState } from "~/types/cursor";
import type Experience from "../Experience";
import { EventEmitter } from "./EventEmitter";
export default class Controls extends EventEmitter {
  private experience: Experience;
  private canvas: HTMLCanvasElement;
  private easing: number;

  private minWheelSpeed: number;
  private wheelDirection: number;
  public wheelDeltaY: number;
  public targetWheelDeltaY: number;
  public scrollOffset: number;

  public normalizedMouse: Vector2;

  private isPaused: boolean = false;

  private holdIntervalId: number | null = null;
  private holdProgress: number = 0;
  private holdMax: number = 400;
  private holdFinished: boolean = false;

  private currentCursorState: CursorState = "base";

  constructor(experience: Experience) {
    super();
    this.experience = experience;
    this.canvas = this.experience.canvas;
    this.easing = 0.1;

    // Wheel
    this.wheelDeltaY = 0;
    this.targetWheelDeltaY = 0;
    this.minWheelSpeed = 0.002;
    this.wheelDirection = 1;
    this.scrollOffset = 0;

    // Mouse
    this.normalizedMouse = new Vector2(0, 0);

    this.onWheel = this.onWheel.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onClick = this.onClick.bind(this);
    this.startHold = this.startHold.bind(this);
    this.stopHold = this.stopHold.bind(this);
    this.addEventListeners();
  }

  public setCursor(state: CursorState): void {
    if (this.currentCursorState === state) return;
    this.currentCursorState = state;
    this.experience.events.trigger("ui:cursor", [{ value: state }]);
  }

  private addEventListeners(): void {
    this.canvas.addEventListener("wheel", this.onWheel, { passive: true });
    this.canvas.addEventListener("click", this.onClick);
    window.addEventListener("mousemove", this.onMouseMove);
    this.canvas.addEventListener("mousedown", this.startHold);
    window.addEventListener("mouseup", this.stopHold);
    window.addEventListener("mouseleave", this.stopHold);
  }

  private removeEventListeners(): void {
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.canvas.removeEventListener("click", this.onClick);
    window.removeEventListener("mousemove", this.onMouseMove);
    this.canvas.removeEventListener("mousedown", this.startHold);
    window.removeEventListener("mouseup", this.stopHold);
    window.removeEventListener("mouseleave", this.stopHold);
  }

  private onWheel(event: WheelEvent): void {
    if (this.isPaused) return;
    this.targetWheelDeltaY += event.deltaY * 0.0001;
    this.targetWheelDeltaY = clamp(this.targetWheelDeltaY, -2, 2);
    this.wheelDirection = event.deltaY > 0 ? 1 : -1;
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.isPaused) return;
    this.normalizedMouse.x =
      (event.clientX / this.experience.sizes.width) * 2 - 1;
    this.normalizedMouse.y =
      -(event.clientY / this.experience.sizes.height) * 2 + 1;
  }

  private onClick(event: MouseEvent): void {
    if (this.isPaused) return;
    this.trigger("click", [event]);
  }

  private startHold(): void {
    this.trigger("mousedown");
    if (this.isPaused || this.holdIntervalId !== null || this.holdFinished)
      return;

    this.holdIntervalId = window.setInterval(() => {
      this.holdProgress++;
      this.trigger("hold", [this.holdProgress]);

      if (this.holdProgress >= this.holdMax) {
        this.holdFinished = true;
        this.stopHold();
      }
    }, 10);
  }

  private stopHold(): void {
    this.trigger("mouseup");
    if (this.holdIntervalId !== null) {
      clearInterval(this.holdIntervalId);
      this.holdIntervalId = null;
    }
    this.holdProgress = 0;
    this.holdFinished = false;
    this.trigger("hold", [0]);
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  public update(): void {
    this.wheelDeltaY +=
      (this.targetWheelDeltaY - this.wheelDeltaY) * this.easing;
    this.scrollOffset += this.wheelDeltaY;

    if (Math.abs(this.targetWheelDeltaY) < this.minWheelSpeed) {
      this.targetWheelDeltaY = this.wheelDirection * this.minWheelSpeed;
    }

    this.targetWheelDeltaY *= 0.9;
  }

  public destroy(): void {
    this.removeEventListeners();
  }
}
