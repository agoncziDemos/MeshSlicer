#pragma once

#include <cstddef>
#include <vector>

#include "slicer_geometry.hpp"

/*
 * @brief Inclusive slice-index range where one triangle can intersect the stack.
 */
struct SliceIndexRange {
    /*
     * @brief First slice index that can intersect the triangle.
     */
    int first = 0;

    /*
     * @brief Last slice index that can intersect the triangle.
     */
    int last = 0;
};

/*
 * @brief Gets the signed offset of one slice relative to the center plane.
 *
 * @param sliceIndex Index of the slice.
 * @param sliceCount Total number of slices in the stack.
 * @param sliceSpacing Distance between adjacent slices.
 * @return Signed offset along the stack normal.
 */
float getSliceOffset(int sliceIndex, int sliceCount, float sliceSpacing);

/*
 * @brief Computes the signed normal-distance range for one triangle.
 *
 * @param vertices Flat triangle vertex buffer arranged as x, y, z values.
 * @param triangleOffset Offset of the triangle's first float.
 * @param planeFrame Center plane frame.
 * @param minDistance Output minimum signed distance.
 * @param maxDistance Output maximum signed distance.
 */
void computeTriangleDistanceRange(
    const std::vector<float>& vertices,
    std::size_t triangleOffset,
    const PlaneFrame& planeFrame,
    float& minDistance,
    float& maxDistance
);

/*
 * @brief Computes the slice index range possibly intersected by one triangle.
 *
 * @param minDistance Minimum signed triangle distance from the center plane.
 * @param maxDistance Maximum signed triangle distance from the center plane.
 * @param sliceCount Number of slices in the stack.
 * @param sliceSpacing Distance between adjacent slices.
 * @param output Slice index range populated when the triangle can intersect the stack.
 * @return True when the triangle can intersect at least one slice.
 */
bool computeSliceIndexRange(
    float minDistance,
    float maxDistance,
    int sliceCount,
    float sliceSpacing,
    SliceIndexRange& output
);
