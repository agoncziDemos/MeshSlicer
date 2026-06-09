#include "slicer_sweep.hpp"

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <vector>

namespace {

constexpr std::size_t kFloatsPerTriangle = 9;
constexpr int kFloatsPerSegment = 4;
constexpr float kSliceRangeEpsilon = 1.0e-5f;

/*
 * @brief Inclusive slice-index range where one triangle can intersect the stack.
 */
struct SliceIndexRange {
    /*
     * @brief First slice index that can intersect the triangle.
     */
    int first;

    /*
     * @brief Last slice index that can intersect the triangle.
     */
    int last;
};

/*
 * @brief Reads a 3D vector from a flat float vector.
 * @param values Source float vector.
 * @param offset Index of the first x, y, z value.
 * @return 3D vector read from the source values.
 */
Vec3 readVec3(const std::vector<float>& values, std::size_t offset) {
    return {
        values[offset],
        values[offset + 1],
        values[offset + 2],
    };
}

/*
 * @brief Gets the signed offset of one slice relative to the center plane.
 * @param sliceIndex Index of the slice.
 * @param sliceCount Total number of slices in the stack.
 * @param sliceSpacing Distance between adjacent slices.
 * @return Signed offset along the stack normal.
 */
float getSliceOffset(int sliceIndex, int sliceCount, float sliceSpacing) {
    return (
        static_cast<float>(sliceIndex) -
        static_cast<float>(sliceCount - 1) * 0.5f
    ) * sliceSpacing;
}

/*
 * @brief Computes the signed normal-distance range for one triangle.
 * @param vertices Flat triangle vertex buffer.
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
) {
    const Vec3 a = readVec3(vertices, triangleOffset);
    const Vec3 b = readVec3(vertices, triangleOffset + 3);
    const Vec3 c = readVec3(vertices, triangleOffset + 6);

    const float distanceA = dot(subtract(a, planeFrame.origin), planeFrame.normal);
    const float distanceB = dot(subtract(b, planeFrame.origin), planeFrame.normal);
    const float distanceC = dot(subtract(c, planeFrame.origin), planeFrame.normal);

    minDistance = std::min(distanceA, std::min(distanceB, distanceC));
    maxDistance = std::max(distanceA, std::max(distanceB, distanceC));
}

/*
 * @brief Computes the slice index range possibly intersected by one triangle.
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
) {
    if (sliceCount <= 0) {
        return false;
    }

    if (std::abs(sliceSpacing) <= kSliceRangeEpsilon) {
        if (minDistance > kSliceRangeEpsilon || maxDistance < -kSliceRangeEpsilon) {
            return false;
        }

        output.first = 0;
        output.last = sliceCount - 1;
        return true;
    }

    const float firstSliceOffset = getSliceOffset(0, sliceCount, sliceSpacing);

    int first = static_cast<int>(
        std::ceil((minDistance - firstSliceOffset) / sliceSpacing - kSliceRangeEpsilon)
    );

    int last = static_cast<int>(
        std::floor((maxDistance - firstSliceOffset) / sliceSpacing + kSliceRangeEpsilon)
    );

    first = std::max(first, 0);
    last = std::min(last, sliceCount - 1);

    if (first > last) {
        return false;
    }

    output.first = first;
    output.last = last;

    return true;
}

/*
 * @brief Compacts the active triangle list by removing inactive entries.
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
    const std::size_t triangleCount = vertices.size() / kFloatsPerTriangle;

    layerSegmentOffsets.clear();
    layerSegmentOffsets.reserve(sliceCount + 1);
    layerSegmentOffsets.push_back(
        static_cast<int>(segments.size()) / kFloatsPerSegment
    );

    if (sliceCount <= 0 || triangleCount == 0) {
        return;
    }

    std::vector<std::vector<int>> startEvents(sliceCount);
    std::vector<std::vector<int>> endEvents(sliceCount + 1);

    for (std::size_t triangleIndex = 0; triangleIndex < triangleCount; ++triangleIndex) {
        const std::size_t triangleOffset = triangleIndex * kFloatsPerTriangle;

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
                static_cast<std::size_t>(triangleIndex) * kFloatsPerTriangle,
                slicePlaneFrame,
                segments
            );
        }

        layerSegmentOffsets.push_back(
            static_cast<int>(segments.size()) / kFloatsPerSegment
        );

        if (activeTriangleIndices.size() > triangleCount / 4) {
            compactActiveTriangles(activeTriangleIndices, activeFlags);
        }
    }
}
