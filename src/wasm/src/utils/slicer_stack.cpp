#include "slicer_stack.hpp"

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <vector>

#include "triangle_buffer.hpp"

namespace {

constexpr float kSliceRangeEpsilon = 1.0e-5f;

} // namespace

float getSliceOffset(int sliceIndex, int sliceCount, float sliceSpacing) {
    return (
        static_cast<float>(sliceIndex) -
        static_cast<float>(sliceCount - 1) * 0.5f
    ) * sliceSpacing;
}

void computeTriangleDistanceRange(
    const std::vector<float>& vertices,
    std::size_t triangleOffset,
    const PlaneFrame& planeFrame,
    float& minDistance,
    float& maxDistance
) {
    const Vec3 a = readTrianglePoint(vertices, triangleOffset);
    const Vec3 b = readTrianglePoint(vertices, triangleOffset + 3);
    const Vec3 c = readTrianglePoint(vertices, triangleOffset + 6);

    const float distanceA = dot(subtract(a, planeFrame.origin), planeFrame.normal);
    const float distanceB = dot(subtract(b, planeFrame.origin), planeFrame.normal);
    const float distanceC = dot(subtract(c, planeFrame.origin), planeFrame.normal);

    minDistance = std::min(distanceA, std::min(distanceB, distanceC));
    maxDistance = std::max(distanceA, std::max(distanceB, distanceC));
}

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
