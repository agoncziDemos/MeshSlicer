import * as THREE from "three";
import type { SlicingPlane } from "../plane/SlicingPlane.ts";
import type { SliceResult, SliceStackResult } from "./sliceTypes.ts";
import {
  computeSliceFromFrame,
  getFrameFromSlicingPlane,
} from "./sliceGeometry.ts";
import { computeSliceStackSwept } from "./sliceSweep.ts";

export type {
  SliceSegment2D,
  SliceResult,
  PlaneSliceFrame,
  SliceStackLayer,
  SliceStackResult,
} from "./sliceTypes.ts";

export function computeSlice(mesh: THREE.Mesh, plane: SlicingPlane): SliceResult {
  return computeSliceFromFrame(mesh, getFrameFromSlicingPlane(plane));
}

export function computeSliceStack(
  mesh: THREE.Mesh,
  plane: SlicingPlane,
  sliceStep: number
): SliceStackResult {
  return computeSliceStackSwept(mesh, plane, sliceStep);
}
