import * as THREE from "three";

export type SliceSegment2D = {
  a: THREE.Vector2;
  b: THREE.Vector2;
};

export type SliceResult = {
  segments: SliceSegment2D[];
};

export type PlaneSliceFrame = {
  origin: THREE.Vector3;
  normal: THREE.Vector3;
  basisX: THREE.Vector3;
  basisY: THREE.Vector3;
};

export type SliceStackLayer = {
  offset: number;
  result: SliceResult;
};

export type SliceStackResult = {
  layers: SliceStackLayer[];
  minOffset: number;
  maxOffset: number;
};
