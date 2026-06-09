#pragma once

#include <vector>

/*
 * @brief Request data for computing a stack of parallel mesh slices.
 */
struct SliceStackRequest {
    /*
     * @brief Flat plane frame arranged as origin, axisX, axisY, normal.
     */
    std::vector<float> planeFrame;

    /*
     * @brief Number of slices to compute.
     */
    int sliceCount;

    /*
     * @brief Distance between adjacent slices.
     */
    float sliceSpacing;
};

/*
 * @brief Result data for a computed stack of mesh slices.
 */
struct SliceStackResult {
    /*
     * @brief Number of triangle faces received by the native slicer.
     */
    int faceCount = 0;

    /*
     * @brief Total native C++ compute time in milliseconds, excluding JS/C++ conversion.
     */
    double nativeComputeTimeMs = 0.0;

    /*
     * @brief Time spent building per-slice triangle candidate lists in milliseconds.
     */
    double candidateBuildTimeMs = 0.0;

    /*
     * @brief Time spent computing slice intersections in milliseconds.
     */
    double sliceIntersectionTimeMs = 0.0;

    /*
     * @brief Flat 2D segment buffer arranged as ax, ay, bx, by per segment.
     * Used to create PNG's on the front-end.
     */
    std::vector<float> segments;

    /*
     * @brief Segment offsets marking where each slice layer starts and ends.
     */
    std::vector<int> layerSegmentOffsets;
};

/*
 * @brief Computes slice data for a mesh using the requested slicing plane stack.
 *
 * @param vertices Flat triangle vertex buffer arranged as x, y, z values. Every 9 floats represent one triangle.
 * @param request Slice stack settings, including the plane frame, slice count, and slice spacing.
 * @return Slice stack result data. Used to create PNG's on the front-end.
 */
SliceStackResult computeSliceStack(
    const std::vector<float>& vertices,
    const SliceStackRequest& request
);
