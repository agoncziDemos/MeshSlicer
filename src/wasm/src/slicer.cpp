#include "slicer.hpp"

#include <chrono>
#include <vector>

#include "utils/slicer_candidates.hpp"
#include "utils/slicer_geometry.hpp"
#include "utils/triangle_buffer.hpp"

namespace {

using Clock = std::chrono::steady_clock;

std::vector<float> savedVertices;

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
 * @brief Gets the number of complete triangle faces stored in native memory.
 *
 * @return Number of saved triangle faces.
 */
int getSavedFaceCount() {
    return static_cast<int>(getTriangleCount(savedVertices));
}

} // namespace

SaveMeshResult saveMesh(const std::vector<float>& vertices) {
    savedVertices = vertices;

    SaveMeshResult result;
    result.faceCount = getSavedFaceCount();

    return result;
}

SliceStackResult computeSavedSliceStack(const SliceStackRequest& request) {
    SliceStackResult result;
    result.faceCount = getSavedFaceCount();

    if (savedVertices.empty()) {
        result.layerSegmentOffsets.push_back(0);
        return result;
    }

    PlaneFrame centerPlaneFrame;

    if (!readPlaneFrame(request.planeFrame, centerPlaneFrame)) {
        result.layerSegmentOffsets.push_back(0);
        return result;
    }

    const int sliceCount = request.sliceCount > 0 ? request.sliceCount : 1;

    SliceCandidateTiming timing;

    const auto nativeComputeStart = Clock::now();

    appendSliceStackSegmentsFromCandidates(
        savedVertices,
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

SliceStackResult computeSliceStack(
    const std::vector<float>& vertices,
    const SliceStackRequest& request
) {
    saveMesh(vertices);

    return computeSavedSliceStack(request);
}
