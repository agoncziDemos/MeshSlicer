#include "slicer.hpp"

#include <chrono>
#include <vector>

#include "utils/slicer_candidates.hpp"
#include "utils/slicer_geometry.hpp"
#include "utils/triangle_buffer.hpp"

namespace {

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

} // namespace

SliceStackResult computeSliceStack(
    const std::vector<float>& vertices,
    const SliceStackRequest& request
) {
    SliceStackResult result;
    result.faceCount = static_cast<int>(getTriangleCount(vertices));

    PlaneFrame centerPlaneFrame;

    if (!readPlaneFrame(request.planeFrame, centerPlaneFrame)) {
        result.layerSegmentOffsets.push_back(0);
        return result;
    }

    const int sliceCount = request.sliceCount > 0 ? request.sliceCount : 1;

    SliceCandidateTiming timing;

    const auto nativeComputeStart = Clock::now();

    appendSliceStackSegmentsFromCandidates(
        vertices,
        centerPlaneFrame,
        sliceCount,
        request.sliceSpacing,
        result.segments,
        result.layerSegmentOffsets,
        &timing
    );

    const auto nativeComputeEnd = Clock::now();

    result.candidateBuildTimeMs = timing.candidateBuildTimeMs;
    result.sliceIntersectionTimeMs = timing.sliceIntersectionTimeMs;
    result.segmentMergeTimeMs = timing.segmentMergeTimeMs;
    result.nativeComputeTimeMs = elapsedMilliseconds(
        nativeComputeStart,
        nativeComputeEnd
    );

    return result;
}
