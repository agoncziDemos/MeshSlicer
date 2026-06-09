#include "slicer_candidates.hpp"

#include <algorithm>
#include <chrono>
#include <cstddef>
#include <thread>
#include <vector>

#include "slicer_stack.hpp"
#include "triangle_buffer.hpp"

namespace {

constexpr unsigned int kMaxWorkerCount = 8;

using Clock = std::chrono::steady_clock;

/*
 * @brief Computes elapsed time between two time points in milliseconds.
 *
 * @param start Start time.
 * @param end End time.
 * @return Elapsed time in milliseconds.
 */
double elapsedMilliseconds(Clock::time_point start, Clock::time_point end) {
    return std::chrono::duration<double, std::milli>(end - start).count();
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

    const std::size_t triangleCount = getTriangleCount(vertices);

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
 * @brief Computes raw line segments for a range of slice layers.
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
                getTriangleOffset(static_cast<std::size_t>(triangleIndex)),
                slicePlaneFrame,
                segments
            );
        }
    }
}

/*
 * @brief Appends per-slice segment buffers to the final flat output buffer.
 *
 * @param sliceSegments Segment buffers produced for each slice.
 * @param segments Flat output buffer arranged as ax, ay, bx, by per segment.
 * @param layerSegmentOffsets Output offsets marking each layer's segment range.
 */
void appendMergedSliceSegments(
    std::vector<std::vector<float>>& sliceSegments,
    std::vector<float>& segments,
    std::vector<int>& layerSegmentOffsets
) {
    for (std::vector<float>& currentSliceSegments : sliceSegments) {
        segments.insert(
            segments.end(),
            currentSliceSegments.begin(),
            currentSliceSegments.end()
        );

        layerSegmentOffsets.push_back(
            static_cast<int>(segments.size() / kFloatsPerSegment)
        );
    }
}

} // namespace

void appendSliceStackSegmentsFromCandidates(
    const std::vector<float>& vertices,
    const PlaneFrame& centerPlaneFrame,
    int sliceCount,
    float sliceSpacing,
    std::vector<float>& segments,
    std::vector<int>& layerSegmentOffsets,
    SliceCandidateTiming* timing
) {
    layerSegmentOffsets.clear();
    layerSegmentOffsets.reserve(sliceCount + 1);
    layerSegmentOffsets.push_back(
        static_cast<int>(segments.size() / kFloatsPerSegment)
    );

    if (sliceCount <= 0 || vertices.empty()) {
        return;
    }

    const auto candidateBuildStart = Clock::now();

    const std::vector<std::vector<int>> candidates = buildSliceCandidates(
        vertices,
        centerPlaneFrame,
        sliceCount,
        sliceSpacing
    );

    const auto candidateBuildEnd = Clock::now();

    std::vector<std::vector<float>> sliceSegments(sliceCount);

    const auto sliceIntersectionStart = Clock::now();

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

    const auto sliceIntersectionEnd = Clock::now();

    const auto segmentMergeStart = Clock::now();

    appendMergedSliceSegments(
        sliceSegments,
        segments,
        layerSegmentOffsets
    );

    const auto segmentMergeEnd = Clock::now();

    if (timing) {
        timing->candidateBuildTimeMs = elapsedMilliseconds(
            candidateBuildStart,
            candidateBuildEnd
        );
        timing->sliceIntersectionTimeMs = elapsedMilliseconds(
            sliceIntersectionStart,
            sliceIntersectionEnd
        );
        timing->segmentMergeTimeMs = elapsedMilliseconds(
            segmentMergeStart,
            segmentMergeEnd
        );
    }
}
