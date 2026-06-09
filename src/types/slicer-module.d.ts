declare module "*/wasm/dist/slicer.js" {
  export type WasmSaveMeshResult = {
    faceCount: number;
  };

  export type WasmSliceStackResult = {
    faceCount: number;
    nativeComputeTimeMs: number;
    candidateBuildTimeMs: number;
    sliceIntersectionTimeMs: number;
    segmentMergeTimeMs: number;
    segments: Float32Array;
    layerSegmentOffsets: Int32Array;
  };

  export type SlicerModule = {
    saveMesh(vertices: number[] | Float32Array): WasmSaveMeshResult;

    computeSavedSliceStack(
      planeFrame: number[] | Float32Array,
      sliceCount: number,
      sliceSpacing: number
    ): WasmSliceStackResult;

    computeSliceStack(
      vertices: number[] | Float32Array,
      planeFrame: number[] | Float32Array,
      sliceCount: number,
      sliceSpacing: number
    ): WasmSliceStackResult;
  };

  export type SlicerModuleOptions = {
    locateFile?: (path: string, prefix: string) => string;
  };

  const createSlicerModule: (
    options?: SlicerModuleOptions
  ) => Promise<SlicerModule>;

  export default createSlicerModule;
}
