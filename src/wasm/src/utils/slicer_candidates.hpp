#pragma once

#include <vector>

#include "slicer_geometry.hpp"

/*
 * @brief Native timing data for the candidate-based slicer.
 */
struct SliceCandidateTiming {
    /*
     * @brief Time spent building per-slice triangle candidate lists.
     */
    double candidateBuildTimeMs = 0.0;

    /*
     * @brief Time spent computing raw slice line segments from candidate triangles.
     */
    double sliceIntersectionTimeMs = 0.0;

    /*
     * @brief Time spent merging per-slice worker outputs into the final flat segment buffer.
     */
    double segmentMergeTimeMs = 0.0;
};

/*
 * @brief Appends a full stack of slice segments using per-slice candidate lists.
 *
 * @param vertices Flat triangle vertex buffer arranged as x, y, z values.
 * @param centerPlaneFrame Plane frame at the center of the slice stack.
 * @param sliceCount Number of slices to compute.
 * @param sliceSpacing Distance between adjacent slices.
 * @param segments Flat output buffer arranged as ax, ay, bx, by per segment.
 * @param layerSegmentOffsets Output offsets marking each layer's segment range.
 * @param timing Optional output timing for the native slicing stages.
 */
void appendSliceStackSegmentsFromCandidates(
    const std::vector<float>& vertices,
    const PlaneFrame& centerPlaneFrame,
    int sliceCount,
    float sliceSpacing,
    std::vector<float>& segments,
    std::vector<int>& layerSegmentOffsets,
    SliceCandidateTiming* timing = nullptr
);
