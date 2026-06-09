import * as THREE from "three";
import type { SlicingPlane } from "../plane/SlicingPlane.ts";
import type {
  PlaneSliceFrame,
  SliceStackLayer,
  SliceStackResult,
} from "./sliceTypes.ts";
import {
  EPS,
  appendTriangleSliceSegment,
  buildWorldTriangleBuffer,
  getFrameFromSlicingPlane,
  getProjectionRangeFromTriangleBuffer,
  getShiftedFrame,
  getTriangleDistanceRange,
} from "./sliceGeometry.ts";

type SliceIndexRange = {
  first: number;
  last: number;
};

export function computeSliceStackSwept(
  mesh: THREE.Mesh,
  plane: SlicingPlane,
  sliceStep: number
): SliceStackResult {
  mesh.updateMatrixWorld(true);
  plane.group.updateMatrixWorld(true);

  const triangles = buildWorldTriangleBuffer(mesh);
  const baseFrame = getFrameFromSlicingPlane(plane);

  const range = getProjectionRangeFromTriangleBuffer(
    triangles,
    baseFrame.origin,
    baseFrame.normal
  );

  if (!range) {
    return {
      layers: [],
      minOffset: 0,
      maxOffset: 0,
    };
  }

  const firstOffset = range.min + sliceStep * 0.5;
  const lastOffsetLimit = range.max - sliceStep * 0.5;

  if (firstOffset > lastOffsetLimit) {
    return {
      layers: [],
      minOffset: firstOffset,
      maxOffset: lastOffsetLimit,
    };
  }

  const sliceCount =
    Math.floor((lastOffsetLimit - firstOffset) / sliceStep) + 1;
  const lastOffset = firstOffset + (sliceCount - 1) * sliceStep;
  const centerOffset = (firstOffset + lastOffset) * 0.5;

  const centerFrame = getShiftedFrame(baseFrame, centerOffset);

  return computeSliceStackFromTriangleBuffer(
    triangles,
    centerFrame,
    sliceCount,
    sliceStep,
    firstOffset,
    lastOffset
  );
}

function computeSliceStackFromTriangleBuffer(
  triangles: ReturnType<typeof buildWorldTriangleBuffer>,
  centerFrame: PlaneSliceFrame,
  sliceCount: number,
  sliceSpacing: number,
  firstOffset: number,
  lastOffset: number
): SliceStackResult {
  const startEvents = Array.from({ length: sliceCount }, () => [] as number[]);
  const endEvents = Array.from({ length: sliceCount + 1 }, () => [] as number[]);

  for (let triangleIndex = 0; triangleIndex < triangles.triangleCount; triangleIndex++) {
    const range = getTriangleDistanceRange(
      triangles,
      triangleIndex,
      centerFrame.origin,
      centerFrame.normal
    );

    const sliceIndexRange = computeSliceIndexRange(
      range.min,
      range.max,
      sliceCount,
      sliceSpacing
    );

    if (!sliceIndexRange) {
      continue;
    }

    startEvents[sliceIndexRange.first].push(triangleIndex);
    endEvents[sliceIndexRange.last + 1].push(triangleIndex);
  }

  const layers: SliceStackLayer[] = [];
  const activeTriangleIndices: number[] = [];
  const activeFlags = new Uint8Array(triangles.triangleCount);

  let inactiveSinceCompact = 0;

  for (let sliceIndex = 0; sliceIndex < sliceCount; sliceIndex++) {
    for (const triangleIndex of endEvents[sliceIndex]) {
      activeFlags[triangleIndex] = 0;
      inactiveSinceCompact++;
    }

    for (const triangleIndex of startEvents[sliceIndex]) {
      activeFlags[triangleIndex] = 1;
      activeTriangleIndices.push(triangleIndex);
    }

    const frame = getShiftedFrame(
      centerFrame,
      getSliceOffset(sliceIndex, sliceCount, sliceSpacing)
    );

    const segments: SliceStackLayer["result"]["segments"] = [];

    for (const triangleIndex of activeTriangleIndices) {
      if (activeFlags[triangleIndex] === 0) {
        continue;
      }

      appendTriangleSliceSegment(triangles, triangleIndex, frame, segments);
    }

    if (segments.length > 0) {
      layers.push({
        offset: firstOffset + sliceIndex * sliceSpacing,
        result: { segments },
      });
    }

    if (inactiveSinceCompact > activeTriangleIndices.length * 0.5) {
      compactActiveTriangles(activeTriangleIndices, activeFlags);
      inactiveSinceCompact = 0;
    }
  }

  return {
    layers,
    minOffset: firstOffset,
    maxOffset: lastOffset,
  };
}

function computeSliceIndexRange(
  minDistance: number,
  maxDistance: number,
  sliceCount: number,
  sliceSpacing: number
): SliceIndexRange | null {
  if (sliceCount <= 0) {
    return null;
  }

  if (Math.abs(sliceSpacing) <= EPS) {
    if (minDistance > EPS || maxDistance < -EPS) {
      return null;
    }

    return {
      first: 0,
      last: sliceCount - 1,
    };
  }

  const firstSliceOffset = getSliceOffset(0, sliceCount, sliceSpacing);

  let first = Math.ceil(
    (minDistance - firstSliceOffset) / sliceSpacing - EPS
  );

  let last = Math.floor(
    (maxDistance - firstSliceOffset) / sliceSpacing + EPS
  );

  first = Math.max(first, 0);
  last = Math.min(last, sliceCount - 1);

  if (first > last) {
    return null;
  }

  return { first, last };
}

function getSliceOffset(
  sliceIndex: number,
  sliceCount: number,
  sliceSpacing: number
): number {
  return (
    sliceIndex - (sliceCount - 1) * 0.5
  ) * sliceSpacing;
}

function compactActiveTriangles(
  activeTriangleIndices: number[],
  activeFlags: Uint8Array
): void {
  let writeIndex = 0;

  for (let readIndex = 0; readIndex < activeTriangleIndices.length; readIndex++) {
    const triangleIndex = activeTriangleIndices[readIndex];

    if (activeFlags[triangleIndex] !== 0) {
      activeTriangleIndices[writeIndex] = triangleIndex;
      writeIndex++;
    }
  }

  activeTriangleIndices.length = writeIndex;
}
