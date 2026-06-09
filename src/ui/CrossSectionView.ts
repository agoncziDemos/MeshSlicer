import * as THREE from "three";
import type { SliceResult } from "../engine/slicing/computeSlice.ts";

type CrossSectionViewOptions = {
  id: string;
  label: string;
  verticalPosition: "top" | "bottom";
};

export class CrossSectionView {
  private readonly container: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly label: HTMLDivElement;

  constructor(app: HTMLDivElement, options: CrossSectionViewOptions) {
    this.container = document.createElement("div");
    this.container.id = options.id;

    this.container.style.position = "absolute";
    this.container.style.right = "16px";
    this.container.style.zIndex = "10";

    if (options.verticalPosition === "top") {
      this.container.style.top = "64px";
    } else {
      this.container.style.bottom = "16px";
    }

    this.label = document.createElement("div");
    this.label.id = `${options.id}-label`;
    this.label.textContent = options.label;

    this.canvas = document.createElement("canvas");
    this.canvas.width = 300;
    this.canvas.height = 220;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not create 2D canvas context");
    }

    this.ctx = ctx;

    this.container.appendChild(this.label);
    this.container.appendChild(this.canvas);
    app.appendChild(this.container);

    this.clear();
  }

  clear(): void {
    const width = this.canvas.width;
    const height = this.canvas.height;

    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.strokeStyle = "#dddddd";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    this.ctx.fillStyle = "#777777";
    this.ctx.font = "13px system-ui, sans-serif";
    this.ctx.fillText("No slice", 12, 24);
  }

  draw(slice: SliceResult, viewRadius: number): void {
    if (slice.segments.length === 0) {
      this.clear();
      return;
    }

    const width = this.canvas.width;
    const height = this.canvas.height;
    const padding = 18;

    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.strokeStyle = "#dddddd";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    const scale = Math.min(
      (width - padding * 2) / (viewRadius * 2),
      (height - padding * 2) / (viewRadius * 2)
    );

    const center = new THREE.Vector2(0, 0);

    const toCanvas = (point: THREE.Vector2): THREE.Vector2 => {
      return new THREE.Vector2(
        width / 2 + (point.x - center.x) * scale,
        height / 2 - (point.y - center.y) * scale
      );
    };

    this.ctx.strokeStyle = "#111111";
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();

    for (const segment of slice.segments) {
      const a = toCanvas(segment.a);
      const b = toCanvas(segment.b);

      this.ctx.moveTo(a.x, a.y);
      this.ctx.lineTo(b.x, b.y);
    }

    this.ctx.stroke();

    this.ctx.fillStyle = "#555555";
    this.ctx.font = "12px system-ui, sans-serif";
    this.ctx.fillText(`${slice.segments.length} segments`, 12, height - 12);
  }
}
