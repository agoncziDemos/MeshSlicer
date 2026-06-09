import * as THREE from "three";
import type { SlicingPlane } from "../plane/SlicingPlane.ts";
import type { PlaneSliceFrame, SliceResult, SliceSegment2D } from "./sliceTypes.ts";

export const EPS = 1e-7;

export type TriangleBuffer = {
  vertices: Float32Array;
  triangleCount: number;
};

export type ProjectionRange = {
  min: number;
  max: number;
};

export function getFrameFromSlicingPlane(plane: SlicingPlane): PlaneSliceFrame {
  plane.group.updateMatrixWorld(true);

  const origin = plane.group.getWorldPosition(new THREE.Vector3());
  const normal = plane.getNormalWorld();

  const worldQuaternion = plane.group.getWorldQuaternion(new THREE.Quaternion());

  const basisX = new THREE.Vector3(1, 0, 0)
    .applyQuaternion(worldQuaternion)
    .normalize();

  const basisY = new THREE.Vector3(0, 1, 0)
    .applyQuaternion(worldQuaternion)
    .normalize();

  return {
    origin,
    normal,
    basisX,
    basisY,
  };
}

export function buildWorldTriangleBuffer(mesh: THREE.Mesh): TriangleBuffer {
  const geometry = mesh.geometry;
  const position = geometry.getAttribute("position");

  if (!position) {
    return {
      vertices: new Float32Array(),
      triangleCount: 0,
    };
  }

  mesh.updateMatrixWorld(true);

  const index = geometry.getIndex();
  const triangleCount = index
    ? Math.floor(index.count / 3)
    : Math.floor(position.count / 3);

  const vertices = new Float32Array(triangleCount * 9);
  let outputIndex = 0;

  const matrix = mesh.matrixWorld.elements;

  function appendVertex(positionIndex: number): void {
    const x = position.getX(positionIndex);
    const y = position.getY(positionIndex);
    const z = position.getZ(positionIndex);

    vertices[outputIndex++] =
      matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
    vertices[outputIndex++] =
      matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
    vertices[outputIndex++] =
      matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
  }

  if (index) {
    for (let i = 0; i < triangleCount * 3; i++) {
      appendVertex(index.getX(i));
    }
  } else {
    for (let i = 0; i < triangleCount * 3; i++) {
      appendVertex(i);
    }
  }

  return {
    vertices,
    triangleCount,
  };
}

export function getProjectionRangeFromTriangleBuffer(
  triangles: TriangleBuffer,
  origin: THREE.Vector3,
  normal: THREE.Vector3
): ProjectionRange | null {
  const vertices = triangles.vertices;

  if (vertices.length === 0) {
    return null;
  }

  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < vertices.length; i += 3) {
    const distance =
      (vertices[i] - origin.x) * normal.x +
      (vertices[i + 1] - origin.y) * normal.y +
      (vertices[i + 2] - origin.z) * normal.z;

    min = Math.min(min, distance);
    max = Math.max(max, distance);
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return null;
  }

  return { min, max };
}

export function getTriangleDistanceRange(
  triangles: TriangleBuffer,
  triangleIndex: number,
  origin: THREE.Vector3,
  normal: THREE.Vector3
): ProjectionRange {
  const vertices = triangles.vertices;
  const offset = triangleIndex * 9;

  const da =
    (vertices[offset] - origin.x) * normal.x +
    (vertices[offset + 1] - origin.y) * normal.y +
    (vertices[offset + 2] - origin.z) * normal.z;

  const db =
    (vertices[offset + 3] - origin.x) * normal.x +
    (vertices[offset + 4] - origin.y) * normal.y +
    (vertices[offset + 5] - origin.z) * normal.z;

  const dc =
    (vertices[offset + 6] - origin.x) * normal.x +
    (vertices[offset + 7] - origin.y) * normal.y +
    (vertices[offset + 8] - origin.z) * normal.z;

  return {
    min: Math.min(da, db, dc),
    max: Math.max(da, db, dc),
  };
}

export function getShiftedFrame(
  frame: PlaneSliceFrame,
  offset: number
): PlaneSliceFrame {
  return {
    origin: frame.origin.clone().add(frame.normal.clone().multiplyScalar(offset)),
    normal: frame.normal,
    basisX: frame.basisX,
    basisY: frame.basisY,
  };
}

export function computeSliceFromFrame(
  mesh: THREE.Mesh,
  frame: PlaneSliceFrame
): SliceResult {
  const triangles = buildWorldTriangleBuffer(mesh);

  return computeSliceFromTriangleBuffer(triangles, frame);
}

export function computeSliceFromTriangleBuffer(
  triangles: TriangleBuffer,
  frame: PlaneSliceFrame
): SliceResult {
  const segments: SliceSegment2D[] = [];

  for (let triangleIndex = 0; triangleIndex < triangles.triangleCount; triangleIndex++) {
    appendTriangleSliceSegment(triangles, triangleIndex, frame, segments);
  }

  return { segments };
}

export function appendTriangleSliceSegment(
  triangles: TriangleBuffer,
  triangleIndex: number,
  frame: PlaneSliceFrame,
  segments: SliceSegment2D[]
): void {
  const vertices = triangles.vertices;
  const offset = triangleIndex * 9;

  const ax = vertices[offset];
  const ay = vertices[offset + 1];
  const az = vertices[offset + 2];

  const bx = vertices[offset + 3];
  const by = vertices[offset + 4];
  const bz = vertices[offset + 5];

  const cx = vertices[offset + 6];
  const cy = vertices[offset + 7];
  const cz = vertices[offset + 8];

  const da = signedDistanceToFrame(ax, ay, az, frame);
  const db = signedDistanceToFrame(bx, by, bz, frame);
  const dc = signedDistanceToFrame(cx, cy, cz, frame);

  const points: number[] = [];

  addEdgeIntersection(ax, ay, az, bx, by, bz, da, db, points);
  addEdgeIntersection(bx, by, bz, cx, cy, cz, db, dc, points);
  addEdgeIntersection(cx, cy, cz, ax, ay, az, dc, da, points);

  if (points.length < 6) {
    return;
  }

  const p0 = projectToFrame2D(points[0], points[1], points[2], frame);
  const p1 = projectToFrame2D(points[3], points[4], points[5], frame);

  if (p0.distanceToSquared(p1) < EPS * EPS) {
    return;
  }

  segments.push({ a: p0, b: p1 });
}

function signedDistanceToFrame(
  x: number,
  y: number,
  z: number,
  frame: PlaneSliceFrame
): number {
  return (
    (x - frame.origin.x) * frame.normal.x +
    (y - frame.origin.y) * frame.normal.y +
    (z - frame.origin.z) * frame.normal.z
  );
}

function addEdgeIntersection(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  da: number,
  db: number,
  points: number[]
): void {
  const aOnPlane = Math.abs(da) <= EPS;
  const bOnPlane = Math.abs(db) <= EPS;

  if (aOnPlane && bOnPlane) {
    return;
  }

  if (aOnPlane) {
    addUniquePoint(points, ax, ay, az);
    return;
  }

  if (bOnPlane) {
    addUniquePoint(points, bx, by, bz);
    return;
  }

  const crossesPlane = (da < 0 && db > 0) || (da > 0 && db < 0);

  if (!crossesPlane) {
    return;
  }

  const t = da / (da - db);

  addUniquePoint(
    points,
    ax + (bx - ax) * t,
    ay + (by - ay) * t,
    az + (bz - az) * t
  );
}

function addUniquePoint(
  points: number[],
  x: number,
  y: number,
  z: number
): void {
  for (let i = 0; i < points.length; i += 3) {
    const dx = points[i] - x;
    const dy = points[i + 1] - y;
    const dz = points[i + 2] - z;

    if (dx * dx + dy * dy + dz * dz <= EPS * EPS) {
      return;
    }
  }

  points.push(x, y, z);
}

function projectToFrame2D(
  x: number,
  y: number,
  z: number,
  frame: PlaneSliceFrame
): THREE.Vector2 {
  const rx = x - frame.origin.x;
  const ry = y - frame.origin.y;
  const rz = z - frame.origin.z;

  return new THREE.Vector2(
    rx * frame.basisX.x + ry * frame.basisX.y + rz * frame.basisX.z,
    rx * frame.basisY.x + ry * frame.basisY.y + rz * frame.basisY.z
  );
}
