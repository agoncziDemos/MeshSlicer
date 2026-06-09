import * as THREE from "three";

import type { SlicingPlane } from "../plane/SlicingPlane.ts";
import createSlicerModule from "../../wasm/dist/slicer.js";
import type {
  SliceResult,
  SliceStackLayer,
  SliceStackResult,
} from "./computeSlice.ts";

export type WasmComputedSliceStack = SliceStackResult & {
  faceCount: number;
  nativeComputeTimeMs: number;
  candidateBuildTimeMs: number;
  sliceIntersectionTimeMs: number;
  segmentMergeTimeMs: number;
};

type WasmSliceStackResult = {
  faceCount: number;
  nativeComputeTimeMs: number;
  candidateBuildTimeMs: number;
  sliceIntersectionTimeMs: number;
  segmentMergeTimeMs: number;
  segments: number[];
  layerSegmentOffsets: number[];
};

type ProjectionRange = {
  min: number;
  max: number;
};

type SliceStackRequest = {
  planeOrigin: THREE.Vector3;
  planeNormal: THREE.Vector3;
  basisX: THREE.Vector3;
  basisY: THREE.Vector3;
  sliceCount: number;
  sliceSpacing: number;
  firstOffset: number;
  lastOffset: number;
};

let slicerModulePromise: ReturnType<typeof createSlicerModule> | null = null;

function getSlicerModule(): ReturnType<typeof createSlicerModule> {
  slicerModulePromise ??= createSlicerModule({
    locateFile: (path) => {
      return new URL(`../../wasm/dist/${path}`, import.meta.url).href;
    },
  });

  return slicerModulePromise;
}

export async function computeWasmSliceStack(
  mesh: THREE.Mesh,
  plane: SlicingPlane,
  sliceStep: number
): Promise<WasmComputedSliceStack> {
  const request = createSliceStackRequest(mesh, plane, sliceStep);

  if (!request) {
    return {
      faceCount: 0,
      nativeComputeTimeMs: 0,
      candidateBuildTimeMs: 0,
      sliceIntersectionTimeMs: 0,
      segmentMergeTimeMs: 0,
      layers: [],
      minOffset: 0,
      maxOffset: 0,
    };
  }

  const module = await getSlicerModule();

  const result = module.computeSliceStack(
    extractMeshTriangles(mesh),
    extractPlaneFrame(request),
    request.sliceCount,
    request.sliceSpacing
  );

  return {
    faceCount: result.faceCount,
    nativeComputeTimeMs: result.nativeComputeTimeMs,
    candidateBuildTimeMs: result.candidateBuildTimeMs,
    sliceIntersectionTimeMs: result.sliceIntersectionTimeMs,
    segmentMergeTimeMs: result.segmentMergeTimeMs,
    layers: convertWasmSliceStackResult(result, request),
    minOffset: request.firstOffset,
    maxOffset: request.lastOffset,
  };
}

function createSliceStackRequest(
  mesh: THREE.Mesh,
  plane: SlicingPlane,
  sliceStep: number
): SliceStackRequest | null {
  mesh.updateMatrixWorld(true);
  plane.group.updateMatrixWorld(true);

  const planeOrigin = plane.group.getWorldPosition(new THREE.Vector3());
  const planeNormal = plane.getNormalWorld();

  const range = getProjectionRange(mesh, planeOrigin, planeNormal);

  if (!range) {
    return null;
  }

  const firstOffset = range.min + sliceStep * 0.5;
  const lastOffsetLimit = range.max - sliceStep * 0.5;

  if (firstOffset > lastOffsetLimit) {
    return null;
  }

  const sliceCount = Math.floor((lastOffsetLimit - firstOffset) / sliceStep) + 1;
  const lastOffset = firstOffset + (sliceCount - 1) * sliceStep;
  const centerOffset = (firstOffset + lastOffset) * 0.5;

  const centeredOrigin = planeOrigin
    .clone()
    .add(planeNormal.clone().multiplyScalar(centerOffset));

  const worldQuaternion = plane.group.getWorldQuaternion(new THREE.Quaternion());

  const basisX = new THREE.Vector3(1, 0, 0)
    .applyQuaternion(worldQuaternion)
    .normalize();

  const basisY = new THREE.Vector3(0, 1, 0)
    .applyQuaternion(worldQuaternion)
    .normalize();

  return {
    planeOrigin: centeredOrigin,
    planeNormal,
    basisX,
    basisY,
    sliceCount,
    sliceSpacing: sliceStep,
    firstOffset,
    lastOffset,
  };
}

function getProjectionRange(
  mesh: THREE.Mesh,
  planeOrigin: THREE.Vector3,
  planeNormal: THREE.Vector3
): ProjectionRange | null {
  const geometry = mesh.geometry;

  geometry.computeBoundingBox();

  const boundingBox = geometry.boundingBox;

  if (!boundingBox) {
    return null;
  }

  const corners = [
    new THREE.Vector3(boundingBox.min.x, boundingBox.min.y, boundingBox.min.z),
    new THREE.Vector3(boundingBox.min.x, boundingBox.min.y, boundingBox.max.z),
    new THREE.Vector3(boundingBox.min.x, boundingBox.max.y, boundingBox.min.z),
    new THREE.Vector3(boundingBox.min.x, boundingBox.max.y, boundingBox.max.z),
    new THREE.Vector3(boundingBox.max.x, boundingBox.min.y, boundingBox.min.z),
    new THREE.Vector3(boundingBox.max.x, boundingBox.min.y, boundingBox.max.z),
    new THREE.Vector3(boundingBox.max.x, boundingBox.max.y, boundingBox.min.z),
    new THREE.Vector3(boundingBox.max.x, boundingBox.max.y, boundingBox.max.z),
  ];

  let min = Infinity;
  let max = -Infinity;

  for (const corner of corners) {
    corner.applyMatrix4(mesh.matrixWorld);

    const offset = corner.clone().sub(planeOrigin).dot(planeNormal);

    min = Math.min(min, offset);
    max = Math.max(max, offset);
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return null;
  }

  return { min, max };
}

function extractMeshTriangles(mesh: THREE.Mesh): number[] {
  const geometry = mesh.geometry;
  const position = geometry.getAttribute("position");

  if (!position) {
    throw new Error("Mesh geometry has no position attribute");
  }

  mesh.updateMatrixWorld(true);

  const index = geometry.getIndex();
  const vertices: number[] = [];

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();

  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      a.fromBufferAttribute(position, index.getX(i)).applyMatrix4(
        mesh.matrixWorld
      );
      b.fromBufferAttribute(position, index.getX(i + 1)).applyMatrix4(
        mesh.matrixWorld
      );
      c.fromBufferAttribute(position, index.getX(i + 2)).applyMatrix4(
        mesh.matrixWorld
      );

      appendVertex(vertices, a);
      appendVertex(vertices, b);
      appendVertex(vertices, c);
    }

    return vertices;
  }

  for (let i = 0; i < position.count; i += 3) {
    a.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
    b.fromBufferAttribute(position, i + 1).applyMatrix4(mesh.matrixWorld);
    c.fromBufferAttribute(position, i + 2).applyMatrix4(mesh.matrixWorld);

    appendVertex(vertices, a);
    appendVertex(vertices, b);
    appendVertex(vertices, c);
  }

  return vertices;
}

function extractPlaneFrame(request: SliceStackRequest): number[] {
  return [
    request.planeOrigin.x,
    request.planeOrigin.y,
    request.planeOrigin.z,
    request.basisX.x,
    request.basisX.y,
    request.basisX.z,
    request.basisY.x,
    request.basisY.y,
    request.basisY.z,
    request.planeNormal.x,
    request.planeNormal.y,
    request.planeNormal.z,
  ];
}

function convertWasmSliceStackResult(
  result: WasmSliceStackResult,
  request: SliceStackRequest
): SliceStackLayer[] {
  const layers: SliceStackLayer[] = [];

  for (
    let layerIndex = 0;
    layerIndex < result.layerSegmentOffsets.length - 1;
    layerIndex++
  ) {
    const startSegment = result.layerSegmentOffsets[layerIndex];
    const endSegment = result.layerSegmentOffsets[layerIndex + 1];

    if (startSegment === endSegment) {
      continue;
    }

    const offset = request.firstOffset + layerIndex * request.sliceSpacing;

    layers.push({
      offset,
      result: {
        segments: convertFlatSegments(result.segments, startSegment, endSegment),
      },
    });
  }

  return layers;
}

function convertFlatSegments(
  segments: number[],
  startSegment: number,
  endSegment: number
): SliceResult["segments"] {
  const result: SliceResult["segments"] = [];

  for (
    let segmentIndex = startSegment;
    segmentIndex < endSegment;
    segmentIndex++
  ) {
    const offset = segmentIndex * 4;

    result.push({
      a: new THREE.Vector2(segments[offset], segments[offset + 1]),
      b: new THREE.Vector2(segments[offset + 2], segments[offset + 3]),
    });
  }

  return result;
}

function appendVertex(vertices: number[], vertex: THREE.Vector3): void {
  vertices.push(vertex.x, vertex.y, vertex.z);
}
