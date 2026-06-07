import * as THREE from "three";
import { SlicingPlane } from "./SlicingPlane";
import { Viewer } from "../viewer/Viewer";

type PlacementState = "idle" | "pick-origin" | "pick-normal";

type DragState =
  | {
      type: "translate-normal";
      axisOrigin: THREE.Vector3;
      axisDirection: THREE.Vector3;
      initialAxisT: number;
      startPosition: THREE.Vector3;
    }
  | {
      type: "rotate";
      axis: THREE.Vector3;
      tangentWorld: THREE.Vector3;
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
      this.setStatus("Plane created. Drag arrow to move; drag handles to rotate.");
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
      const axisOrigin = this.activePlane.group.position.clone();
      const axisDirection = this.activePlane.getNormalWorld();

      const ray = this.viewer.getRayFromEvent(event);
      const initialAxisT = closestParameterOnLineToRay(
        axisOrigin,
        axisDirection,
        ray.origin,
        ray.direction
      );

      this.activeDrag = {
        type: "translate-normal",
        axisOrigin,
        axisDirection,
        initialAxisT,
        startPosition: this.activePlane.group.position.clone(),
      };

      return true;
    }

    const tangentWorld = hit.tangent
      .clone()
      .applyQuaternion(this.activePlane.group.quaternion)
      .normalize();

    this.activeDrag = {
      type: "rotate",
      axis: hit.axis.clone().normalize(),
      tangentWorld,
      startX: event.clientX,
      startY: event.clientY,
      startQuaternion: this.activePlane.group.quaternion.clone(),
    };

    return true;
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.activeDrag || !this.activePlane) {
      return;
    }

    if (this.activeDrag.type === "translate-normal") {
      const ray = this.viewer.getRayFromEvent(event);

      const axisT = closestParameterOnLineToRay(
        this.activeDrag.axisOrigin,
        this.activeDrag.axisDirection,
        ray.origin,
        ray.direction
      );

      const deltaT = axisT - this.activeDrag.initialAxisT;

      this.activePlane.group.position.copy(
        this.activeDrag.startPosition
          .clone()
          .addScaledVector(this.activeDrag.axisDirection, deltaT)
      );

      return;
    }

    const dx = event.clientX - this.activeDrag.startX;
    const dy = event.clientY - this.activeDrag.startY;

    const screenTangent = this.getScreenSpaceDirection(
      this.activeDrag.tangentWorld
    );

    const dragAlongTangent = dx * screenTangent.x + dy * screenTangent.y;
    const angle = dragAlongTangent * 0.012;

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

  private getScreenSpaceDirection(worldDirection: THREE.Vector3): THREE.Vector2 {
    if (!this.activePlane) {
      return new THREE.Vector2(1, 0);
    }

    const origin = this.activePlane.group.position.clone();

    const p0 = origin.clone().project(this.viewer.camera);
    const p1 = origin.clone().add(worldDirection).project(this.viewer.camera);

    const direction = new THREE.Vector2(p1.x - p0.x, -(p1.y - p0.y));

    if (direction.length() < 1e-6) {
      return new THREE.Vector2(1, 0);
    }

    return direction.normalize();
  }
}

function closestParameterOnLineToRay(
  lineOrigin: THREE.Vector3,
  lineDirection: THREE.Vector3,
  rayOrigin: THREE.Vector3,
  rayDirection: THREE.Vector3
): number {
  const p13 = lineOrigin.clone().sub(rayOrigin);

  const d1343 = p13.dot(rayDirection);
  const d4321 = rayDirection.dot(lineDirection);
  const d1321 = p13.dot(lineDirection);
  const d4343 = rayDirection.dot(rayDirection);
  const d2121 = lineDirection.dot(lineDirection);

  const denom = d2121 * d4343 - d4321 * d4321;

  if (Math.abs(denom) < 1e-8) {
    return 0;
  }

  return (d1343 * d4321 - d1321 * d4343) / denom;
}
