#include "slicer.hpp"

#include <vector>

#include "utils/slicer_geometry.hpp"
#include "utils/slicer_sweep.hpp"

namespace {

constexpr int kFloatsPerTriangle = 9;

std::vector<float> savedVertices;

/*
 * @brief Stores the mesh triangle buffer for later native slicing operations.
 * @param vertices Flat triangle vertex buffer arranged as x, y, z values.
 */
void saveMesh(const std::vector<float>& vertices) {
    savedVertices = vertices;
}

/*
 * @brief Gets the number of saved triangle faces.
 * @return Number of complete triangles in the saved vertex buffer.
 */
int getSavedFaceCount() {
    return static_cast<int>(savedVertices.size() / kFloatsPerTriangle);
}

} // namespace

SliceStackResult computeSliceStack(
    const std::vector<float>& vertices,
    const SliceStackRequest& request
) {
    saveMesh(vertices);

    SliceStackResult result;
    result.faceCount = getSavedFaceCount();

    PlaneFrame centerPlaneFrame;

    if (!readPlaneFrame(request.planeFrame, centerPlaneFrame)) {
        result.layerSegmentOffsets.push_back(0);
        return result;
    }

    const int sliceCount = request.sliceCount > 0 ? request.sliceCount : 1;

    appendSliceStackSegments(
        savedVertices,
        centerPlaneFrame,
        sliceCount,
        request.sliceSpacing,
        result.segments,
        result.layerSegmentOffsets
    );

    return result;
}
