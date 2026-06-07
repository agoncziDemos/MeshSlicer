import * as THREE from "three";
import type { SlicingPlane } from "../plane/SlicingPlane";

export type SliceSegment2D = {
  a: THREE.Vector2;
  b: THREE.Vector2;
};

export type SliceResult = {
  segments: SliceSegment2D[];
};

const EPS = 1e-7;

export function computeSlice(mesh: THREE.Mesh, plane: SlicingPlane): SliceResult {
  const geometry = mesh.geometry;
  const position = geometry.getAttribute("position");

  if (!position) {
    return { segments: [] };
  }

  mesh.updateMatrixWorld(true);
  plane.group.updateMatrixWorld(true);

  const planeOrigin = plane.group.getWorldPosition(new THREE.Vector3());
  const planeNormal = plane.getNormalWorld();

  const basisX = new THREE.Vector3(1, 0, 0)
    .applyQuaternion(plane.group.quaternion)
    .normalize();

  const basisY = new THREE.Vector3(0, 1, 0)
    .applyQuaternion(plane.group.quaternion)
    .normalize();

  const index = geometry.getIndex();
  const segments: SliceSegment2D[] = [];

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();

  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      a.fromBufferAttribute(position, index.getX(i)).applyMatrix4(mesh.matrixWorld);
      b.fromBufferAttribute(position, index.getX(i + 1)).applyMatrix4(mesh.matrixWorld);
      c.fromBufferAttribute(position, index.getX(i + 2)).applyMatrix4(mesh.matrixWorld);

      addTriangleSlice(a, b, c, planeOrigin, planeNormal, basisX, basisY, segments);
    }
  } else {
    for (let i = 0; i < position.count; i += 3) {
      a.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
      b.fromBufferAttribute(position, i + 1).applyMatrix4(mesh.matrixWorld);
      c.fromBufferAttribute(position, i + 2).applyMatrix4(mesh.matrixWorld);

      addTriangleSlice(a, b, c, planeOrigin, planeNormal, basisX, basisY, segments);
    }
  }

  return { segments };
}

function addTriangleSlice(
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  planeOrigin: THREE.Vector3,
  planeNormal: THREE.Vector3,
  basisX: THREE.Vector3,
  basisY: THREE.Vector3,
  segments: SliceSegment2D[]
): void {
  const da = signedDistanceToPlane(a, planeOrigin, planeNormal);
  const db = signedDistanceToPlane(b, planeOrigin, planeNormal);
  const dc = signedDistanceToPlane(c, planeOrigin, planeNormal);

  const points: THREE.Vector3[] = [];

  addEdgeIntersection(a, b, da, db, points);
  addEdgeIntersection(b, c, db, dc, points);
  addEdgeIntersection(c, a, dc, da, points);

  const uniquePoints = dedupePoints(points);

  if (uniquePoints.length < 2) {
    return;
  }

  const p0 = projectToPlane2D(uniquePoints[0], planeOrigin, basisX, basisY);
  const p1 = projectToPlane2D(uniquePoints[1], planeOrigin, basisX, basisY);

  if (p0.distanceToSquared(p1) < EPS * EPS) {
    return;
  }

  segments.push({ a: p0, b: p1 });
}

function signedDistanceToPlane(
  point: THREE.Vector3,
  planeOrigin: THREE.Vector3,
  planeNormal: THREE.Vector3
): number {
  return point.clone().sub(planeOrigin).dot(planeNormal);
}

function addEdgeIntersection(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  d0: number,
  d1: number,
  points: THREE.Vector3[]
): void {
  const p0On = Math.abs(d0) < EPS;
  const p1On = Math.abs(d1) < EPS;

  if (p0On && p1On) {
    // Coplanar edge. For the first version, include both endpoints.
    points.push(p0.clone(), p1.clone());
    return;
  }

  if (p0On) {
    points.push(p0.clone());
    return;
  }

  if (p1On) {
    points.push(p1.clone());
    return;
  }

  if ((d0 < 0 && d1 > 0) || (d0 > 0 && d1 < 0)) {
    const t = d0 / (d0 - d1);
    points.push(p0.clone().lerp(p1, t));
  }
}

function dedupePoints(points: THREE.Vector3[]): THREE.Vector3[] {
  const result: THREE.Vector3[] = [];

  for (const point of points) {
    const exists = result.some(
      (existing) => existing.distanceToSquared(point) < EPS * EPS
    );

    if (!exists) {
      result.push(point);
    }
  }

  return result;
}

function projectToPlane2D(
  point: THREE.Vector3,
  planeOrigin: THREE.Vector3,
  basisX: THREE.Vector3,
  basisY: THREE.Vector3
): THREE.Vector2 {
  const relative = point.clone().sub(planeOrigin);

  return new THREE.Vector2(relative.dot(basisX), relative.dot(basisY));
}
