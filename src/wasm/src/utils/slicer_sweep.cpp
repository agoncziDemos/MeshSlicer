#include "slicer_sweep.hpp"

#include <algorithm>
#include <cstddef>
#include <vector>

#include "slicer_stack.hpp"
#include "triangle_buffer.hpp"

namespace {

/*
 * @brief Compacts the active triangle list by removing inactive entries.
 *
 * @param activeTriangleIndices Triangle indices currently tracked by the sweep.
 * @param activeFlags Flags indicating which triangles are still active.
 */
void compactActiveTriangles(
    std::vector<int>& activeTriangleIndices,
    const std::vector<unsigned char>& activeFlags
) {
    activeTriangleIndices.erase(
        std::remove_if(
            activeTriangleIndices.begin(),
            activeTriangleIndices.end(),
            [&activeFlags](int triangleIndex) {
                return activeFlags[triangleIndex] == 0;
            }
        ),
        activeTriangleIndices.end()
    );
}

} // namespace

void appendSliceStackSegments(
    const std::vector<float>& vertices,
    const PlaneFrame& centerPlaneFrame,
    int sliceCount,
    float sliceSpacing,
    std::vector<float>& segments,
    std::vector<int>& layerSegmentOffsets
) {
    const std::size_t triangleCount = getTriangleCount(vertices);

    layerSegmentOffsets.clear();
    layerSegmentOffsets.reserve(sliceCount + 1);
    layerSegmentOffsets.push_back(
        static_cast<int>(segments.size() / kFloatsPerSegment)
    );

    if (sliceCount <= 0 || triangleCount == 0) {
        return;
    }

    std::vector<std::vector<int>> startEvents(sliceCount);
    std::vector<std::vector<int>> endEvents(sliceCount + 1);

    for (std::size_t triangleIndex = 0; triangleIndex < triangleCount; ++triangleIndex) {
        const std::size_t triangleOffset = getTriangleOffset(triangleIndex);

        float minDistance = 0.0f;
        float maxDistance = 0.0f;

        computeTriangleDistanceRange(
            vertices,
            triangleOffset,
            centerPlaneFrame,
            minDistance,
            maxDistance
        );

        SliceIndexRange sliceIndexRange;

        if (!computeSliceIndexRange(
            minDistance,
            maxDistance,
            sliceCount,
            sliceSpacing,
            sliceIndexRange
        )) {
            continue;
        }

        startEvents[sliceIndexRange.first].push_back(
            static_cast<int>(triangleIndex)
        );
        endEvents[sliceIndexRange.last + 1].push_back(
            static_cast<int>(triangleIndex)
        );
    }

    std::vector<int> activeTriangleIndices;
    std::vector<unsigned char> activeFlags(triangleCount, 0);

    for (int sliceIndex = 0; sliceIndex < sliceCount; ++sliceIndex) {
        for (const int triangleIndex : endEvents[sliceIndex]) {
            activeFlags[triangleIndex] = 0;
        }

        for (const int triangleIndex : startEvents[sliceIndex]) {
            activeFlags[triangleIndex] = 1;
            activeTriangleIndices.push_back(triangleIndex);
        }

        const PlaneFrame slicePlaneFrame = getShiftedPlaneFrame(
            centerPlaneFrame,
            getSliceOffset(sliceIndex, sliceCount, sliceSpacing)
        );

        for (const int triangleIndex : activeTriangleIndices) {
            if (activeFlags[triangleIndex] == 0) {
                continue;
            }

            appendTriangleSliceSegment(
                vertices,
                getTriangleOffset(static_cast<std::size_t>(triangleIndex)),
                slicePlaneFrame,
                segments
            );
        }

        layerSegmentOffsets.push_back(
            static_cast<int>(segments.size() / kFloatsPerSegment)
        );

        if (activeTriangleIndices.size() > triangleCount / 4) {
            compactActiveTriangles(activeTriangleIndices, activeFlags);
        }
    }
}
