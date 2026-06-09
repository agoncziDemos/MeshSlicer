#pragma once

#include <vector>

/*
 * @brief Result data for saving a mesh in native slicer memory.
 */
struct SaveMeshResult {
    /*
     * @brief Number of complete triangle faces stored by the native slicer.
     */
    int faceCount = 0;
};

/*
 * @brief Request data for cutting a triangle mesh into parallel cross-section layers.
 */
struct SliceStackRequest {
    /*
     * @brief Flat plane frame arranged as origin, axisX, axisY, normal.
     */
    std::vector<float> planeFrame;

    /*
     * @brief Number of cross-section layers to compute.
     */
    int sliceCount;

    /*
     * @brief Distance between adjacent layers along the slicing normal.
     */
    float sliceSpacing;
};

/*
 * @brief Result data for a computed stack of mesh slices.
 */
struct SliceStackResult {
    /*
     * @brief Number of triangle faces used by the native slicer.
     */
    int faceCount = 0;

    /*
     * @brief Total native C++ slicing time in milliseconds.
     */
    double nativeComputeTimeMs = 0.0;

    /*
     * @brief Time spent building per-slice triangle candidate lists in milliseconds.
     */
    double candidateBuildTimeMs = 0.0;

    /*
     * @brief Time spent computing raw slice line segments in milliseconds.
     */
    double sliceIntersectionTimeMs = 0.0;

    /*
     * @brief Time spent merging per-slice worker outputs into the final flat segment buffer.
     */
    double segmentMergeTimeMs = 0.0;

    /*
     * @brief Flat 2D segment buffer arranged as ax, ay, bx, by per segment.
     */
    std::vector<float> segments;

    /*
     * @brief Segment offsets marking where each slice layer starts and ends.
     */
    std::vector<int> layerSegmentOffsets;
};

/*
 * @brief Stores a triangle mesh in native slicer memory for later slicing.
 *
 * @param vertices Flat triangle vertex buffer arranged as x, y, z values. Every 9 floats represent one triangle.
 * @return Save result containing the number of stored triangle faces.
 */
SaveMeshResult saveMesh(const std::vector<float>& vertices);

/*
 * @brief Cuts the currently saved triangle mesh into parallel cross-section layers.
 *
 * @param request Slice stack settings, including the plane frame, slice count, and slice spacing.
 * @return Slice stack result data used by the frontend to export the generated layers.
 */
SliceStackResult computeSavedSliceStack(const SliceStackRequest& request);

/*
 * @brief Stores a triangle mesh and immediately cuts it into parallel cross-section layers.
 *
 * @param vertices Flat triangle vertex buffer arranged as x, y, z values. Every 9 floats represent one triangle.
 * @param request Slice stack settings, including the plane frame, slice count, and slice spacing.
 * @return Slice stack result data used by the frontend to export the generated layers.
 */
SliceStackResult computeSliceStack(
    const std::vector<float>& vertices,
    const SliceStackRequest& request
);
