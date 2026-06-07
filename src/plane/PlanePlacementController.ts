import * as THREE from "three";
import { SlicingPlane } from "./SlicingPlane";
import { Viewer } from "../viewer/Viewer";

type PlacementState = "idle" | "pick-origin" | "pick-normal";

type DragState =
  | {
      type: "translate-normal";
      startY: number;
      startPosition: THREE.Vector3;
      startQuaternion: THREE.Quaternion;
      scale: number;
    }
  | {
      type: "rotate";
      axis: THREE.Vector3;
      startX: number;
      startY: number;
      startQuaternion: THREE.Quaternion;
    };

type PlanePlacementControllerArgs = {
  viewer: Viewer;
  getMesh: () => THREE.Mesh | null;
  getPlaneSize: () => number;
  onPlaneCreated: (plane: SlicingPlane) => void;
  setStatus: (message: string) => void;
};

export class PlanePlacementController {
  private readonly viewer: Viewer;
  private readonly getMesh: () => THREE.Mesh | null;
  private readonly getPlaneSize: () => number;
  private readonly onPlaneCreated: (plane: SlicingPlane) => void;
  private readonly setStatus: (message: string) => void;

  private placementState: PlacementState = "idle";
  private pendingOrigin: THREE.Vector3 | null = null;
  private activePlane: SlicingPlane | null = null;
  private activeDrag: DragState | null = null;

  constructor(args: PlanePlacementControllerArgs) {
    this.viewer = args.viewer;
    this.getMesh = args.getMesh;
    this.getPlaneSize = args.getPlaneSize;
    this.onPlaneCreated = args.onPlaneCreated;
    this.setStatus = args.setStatus;

    this.viewer.domElement.addEventListener("pointerdown", (event) =>
      this.onPointerDown(event)
    );

    this.viewer.domElement.addEventListener("pointermove", (event) =>
      this.onPointerMove(event)
    );

    this.viewer.domElement.addEventListener("pointerup", (event) =>
      this.onPointerUp(event)
    );
  }

  startPlacement(): void {
    const mesh = this.getMesh();

    if (!mesh) {
      this.setStatus("Load an STL first");
      return;
    }

    this.placementState = "pick-origin";
    this.pendingOrigin = null;
    this.setStatus("Click mesh for plane location");
  }

  clearPlane(): void {
    this.activePlane = null;
    this.activeDrag = null;
    this.placementState = "idle";
    this.pendingOrigin = null;
  }

  private onPointerDown(event: PointerEvent): void {
    if (this.tryStartGizmoDrag(event)) {
      return;
    }

    if (this.placementState === "idle") {
      return;
    }

    const mesh = this.getMesh();
    if (!mesh) {
      return;
    }

    const hitPoint = this.viewer.pickPointOnMesh(event, mesh);

    if (!hitPoint) {
      this.setStatus("Click on the mesh");
      return;
    }

    if (this.placementState === "pick-origin") {
      this.pendingOrigin = hitPoint;
      this.placementState = "pick-normal";
      this.setStatus("Click second point to define normal");
      return;
    }

    if (this.placementState === "pick-normal" && this.pendingOrigin) {
      const normal = hitPoint.clone().sub(this.pendingOrigin);

      if (normal.length() < 1e-6) {
        this.setStatus("Second point too close");
        return;
      }

      const plane = new SlicingPlane(
        this.pendingOrigin,
        normal.normalize(),
        this.getPlaneSize()
      );

      this.activePlane = plane;
      this.onPlaneCreated(plane);

      this.pendingOrigin = null;
      this.placementState = "idle";
      this.setStatus("Plane created. Drag arrow to move; drag rings to rotate.");
    }
  }

  private tryStartGizmoDrag(event: PointerEvent): boolean {
    if (!this.activePlane || this.placementState !== "idle") {
      return false;
    }

    const hits = this.viewer.pickObjects(
      event,
      this.activePlane.gizmo.pickObjects
    );

    if (hits.length === 0) {
      return false;
    }

    const hit = this.activePlane.gizmo.getHitFromObject(hits[0].object);

    if (!hit) {
      return false;
    }

    this.viewer.setControlsEnabled(false);
    this.viewer.domElement.setPointerCapture(event.pointerId);

    if (hit.type === "translate-normal") {
      this.activeDrag = {
        type: "translate-normal",
        startY: event.clientY,
        startPosition: this.activePlane.group.position.clone(),
        startQuaternion: this.activePlane.group.quaternion.clone(),
        scale: this.getPlaneSize() / 300,
      };
    } else {
      this.activeDrag = {
        type: "rotate",
        axis: hit.axis,
        startX: event.clientX,
        startY: event.clientY,
        startQuaternion: this.activePlane.group.quaternion.clone(),
      };
    }

    return true;
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.activeDrag || !this.activePlane) {
      return;
    }

    if (this.activeDrag.type === "translate-normal") {
      const dy = event.clientY - this.activeDrag.startY;
      const movement = -dy * this.activeDrag.scale;

      const normalWorld = new THREE.Vector3(0, 0, 1)
        .applyQuaternion(this.activeDrag.startQuaternion)
        .normalize();

      this.activePlane.group.position.copy(
        this.activeDrag.startPosition
          .clone()
          .addScaledVector(normalWorld, movement)
      );

      return;
    }

    const dx = event.clientX - this.activeDrag.startX;
    const dy = event.clientY - this.activeDrag.startY;
    const angle = (dx + dy) * 0.01;

    const delta = new THREE.Quaternion().setFromAxisAngle(
      this.activeDrag.axis,
      angle
    );

    this.activePlane.group.quaternion
      .copy(this.activeDrag.startQuaternion)
      .multiply(delta);
  }

  private onPointerUp(event: PointerEvent): void {
    if (!this.activeDrag) {
      return;
    }

    this.activeDrag = null;
    this.viewer.setControlsEnabled(true);
    this.viewer.domElement.releasePointerCapture(event.pointerId);
  }
}
