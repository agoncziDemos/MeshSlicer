#include "slicer_candidates.hpp"

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <thread>
#include <vector>

namespace {

constexpr std::size_t kFloatsPerTriangle = 9;
constexpr int kFloatsPerSegment = 4;
constexpr float kSliceRangeEpsilon = 1.0e-5f;
constexpr unsigned int kMaxWorkerCount = 8;

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
 *
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
 *
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
 *
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
 * @brief Builds candidate triangle lists for each slice.
 *
 * @param vertices Flat triangle vertex buffer arranged as x, y, z values.
 * @param centerPlaneFrame Plane frame at the center of the slice stack.
 * @param sliceCount Number of slices to compute.
 * @param sliceSpacing Distance between adjacent slices.
 * @return Per-slice triangle candidate lists.
 */
std::vector<std::vector<int>> buildSliceCandidates(
    const std::vector<float>& vertices,
    const PlaneFrame& centerPlaneFrame,
    int sliceCount,
    float sliceSpacing
) {
    std::vector<std::vector<int>> candidates(sliceCount);

    const std::size_t triangleCount = vertices.size() / kFloatsPerTriangle;

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

        for (
            int sliceIndex = sliceIndexRange.first;
            sliceIndex <= sliceIndexRange.last;
            ++sliceIndex
        ) {
            candidates[sliceIndex].push_back(static_cast<int>(triangleIndex));
        }
    }

    return candidates;
}

/*
 * @brief Gets the number of worker threads to use for slice computation.
 *
 * @param sliceCount Number of slices to compute.
 * @return Worker count.
 */
unsigned int getWorkerCount(int sliceCount) {
    const unsigned int hardwareThreadCount = std::thread::hardware_concurrency();

    unsigned int workerCount = hardwareThreadCount > 0
        ? hardwareThreadCount
        : 1;

    workerCount = std::min(workerCount, kMaxWorkerCount);
    workerCount = std::min(workerCount, static_cast<unsigned int>(sliceCount));

    return std::max(workerCount, 1u);
}

/*
 * @brief Computes a range of slice layers.
 *
 * @param vertices Flat triangle vertex buffer arranged as x, y, z values.
 * @param centerPlaneFrame Plane frame at the center of the slice stack.
 * @param candidates Per-slice triangle candidate lists.
 * @param sliceCount Number of slices to compute.
 * @param sliceSpacing Distance between adjacent slices.
 * @param firstSlice First slice index for this worker.
 * @param endSlice One-past-last slice index for this worker.
 * @param sliceSegments Output segment buffers for each slice.
 */
void computeSliceRange(
    const std::vector<float>& vertices,
    const PlaneFrame& centerPlaneFrame,
    const std::vector<std::vector<int>>& candidates,
    int sliceCount,
    float sliceSpacing,
    int firstSlice,
    int endSlice,
    std::vector<std::vector<float>>& sliceSegments
) {
    for (int sliceIndex = firstSlice; sliceIndex < endSlice; ++sliceIndex) {
        const PlaneFrame slicePlaneFrame = getShiftedPlaneFrame(
            centerPlaneFrame,
            getSliceOffset(sliceIndex, sliceCount, sliceSpacing)
        );

        std::vector<float>& segments = sliceSegments[sliceIndex];

        for (const int triangleIndex : candidates[sliceIndex]) {
            appendTriangleSliceSegment(
                vertices,
                static_cast<std::size_t>(triangleIndex) * kFloatsPerTriangle,
                slicePlaneFrame,
                segments
            );
        }
    }
}

} // namespace

void appendSliceStackSegmentsFromCandidates(
    const std::vector<float>& vertices,
    const PlaneFrame& centerPlaneFrame,
    int sliceCount,
    float sliceSpacing,
    std::vector<float>& segments,
    std::vector<int>& layerSegmentOffsets
) {
    layerSegmentOffsets.clear();
    layerSegmentOffsets.reserve(sliceCount + 1);
    layerSegmentOffsets.push_back(
        static_cast<int>(segments.size()) / kFloatsPerSegment
    );

    if (sliceCount <= 0 || vertices.empty()) {
        return;
    }

    const std::vector<std::vector<int>> candidates = buildSliceCandidates(
        vertices,
        centerPlaneFrame,
        sliceCount,
        sliceSpacing
    );

    std::vector<std::vector<float>> sliceSegments(sliceCount);

    const unsigned int workerCount = getWorkerCount(sliceCount);
    std::vector<std::thread> workers;
    workers.reserve(workerCount);

    for (unsigned int workerIndex = 0; workerIndex < workerCount; ++workerIndex) {
        const int firstSlice = static_cast<int>(
            workerIndex * static_cast<unsigned int>(sliceCount) / workerCount
        );
        const int endSlice = static_cast<int>(
            (workerIndex + 1) * static_cast<unsigned int>(sliceCount) / workerCount
        );

        workers.emplace_back(
            computeSliceRange,
            std::cref(vertices),
            std::cref(centerPlaneFrame),
            std::cref(candidates),
            sliceCount,
            sliceSpacing,
            firstSlice,
            endSlice,
            std::ref(sliceSegments)
        );
    }

    for (std::thread& worker : workers) {
        worker.join();
    }

    for (int sliceIndex = 0; sliceIndex < sliceCount; ++sliceIndex) {
        std::vector<float>& currentSliceSegments = sliceSegments[sliceIndex];

        segments.insert(
            segments.end(),
            currentSliceSegments.begin(),
            currentSliceSegments.end()
        );

        layerSegmentOffsets.push_back(
            static_cast<int>(segments.size()) / kFloatsPerSegment
        );
    }
}
