#pragma once

#include <vector>

#include "slicer_geometry.hpp"

/*
 * @brief Appends a full stack of slice segments using per-slice candidate lists.
 * @param vertices Flat triangle vertex buffer arranged as x, y, z values.
 * @param centerPlaneFrame Plane frame at the center of the slice stack.
 * @param sliceCount Number of slices to compute.
 * @param sliceSpacing Distance between adjacent slices.
 * @param segments Flat output buffer arranged as ax, ay, bx, by per segment.
 * @param layerSegmentOffsets Output offsets marking each layer's segment range.
 */
void appendSliceStackSegmentsFromCandidates(
    const std::vector<float>& vertices,
    const PlaneFrame& centerPlaneFrame,
    int sliceCount,
    float sliceSpacing,
    std::vector<float>& segments,
    std::vector<int>& layerSegmentOffsets
);
