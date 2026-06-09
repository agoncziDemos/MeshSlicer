declare module "../wasm/dist/slicer.js" {
  type WasmSliceStackResult = {
    faceCount: number;
    nativeComputeTimeMs: number;
    candidateBuildTimeMs: number;
    sliceIntersectionTimeMs: number;
    segmentMergeTimeMs: number;
    segments: number[];
    layerSegmentOffsets: number[];
  };

  type SlicerModule = {
    computeSliceStack(
      vertices: number[] | Float32Array,
      planeFrame: number[] | Float32Array,
      sliceCount: number,
      sliceSpacing: number
    ): WasmSliceStackResult;
  };

  type SlicerModuleOptions = {
    locateFile?: (path: string, prefix: string) => string;
  };

  const createSlicerModule: (
    options?: SlicerModuleOptions
  ) => Promise<SlicerModule>;

  export default createSlicerModule;
}
