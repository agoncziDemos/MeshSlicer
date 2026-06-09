#pragma once

#include <emscripten/bind.h>
#include <emscripten/val.h>

#include <vector>

#include "../src/slicer.hpp"

namespace {

SliceStackResult latestResult;

/*
 * @brief Converts a JavaScript array-like object into a native float vector.
 *
 * @param values JavaScript array or typed array containing numeric values.
 * @return Native vector containing the values as floats.
 */
std::vector<float> toFloatVector(const emscripten::val& values) {
    const auto length = values["length"].as<unsigned int>();

    std::vector<float> result;
    result.reserve(length);

    for (unsigned int i = 0; i < length; ++i) {
        result.push_back(values[i].as<float>());
    }

    return result;
}

/*
 * @brief Creates a JavaScript Float32Array view into a native float vector.
 *
 * @param values Native float vector whose memory will be viewed from JavaScript.
 * @return JavaScript Float32Array view backed by WASM memory.
 */
emscripten::val toFloat32MemoryView(const std::vector<float>& values) {
    return emscripten::val(
        emscripten::typed_memory_view(values.size(), values.data())
    );
}

/*
 * @brief Creates a JavaScript Int32Array view into a native int vector.
 *
 * @param values Native int vector whose memory will be viewed from JavaScript.
 * @return JavaScript Int32Array view backed by WASM memory.
 */
emscripten::val toInt32MemoryView(const std::vector<int>& values) {
    return emscripten::val(
        emscripten::typed_memory_view(values.size(), values.data())
    );
}

/*
 * @brief Converts a native save-mesh result into a JavaScript object.
 *
 * @param result Native save-mesh result.
 * @return JavaScript object containing the save result fields.
 */
emscripten::val toJavaScriptSaveMeshResult(const SaveMeshResult& result) {
    emscripten::val output = emscripten::val::object();
    output.set("faceCount", result.faceCount);

    return output;
}

/*
 * @brief Converts the latest native slice-stack result into a JavaScript object.
 *
 * @return JavaScript object containing slice data and timing fields.
 */
emscripten::val toJavaScriptSliceStackResult() {
    emscripten::val output = emscripten::val::object();
    output.set("faceCount", latestResult.faceCount);
    output.set("nativeComputeTimeMs", latestResult.nativeComputeTimeMs);
    output.set("candidateBuildTimeMs", latestResult.candidateBuildTimeMs);
    output.set("sliceIntersectionTimeMs", latestResult.sliceIntersectionTimeMs);
    output.set("segmentMergeTimeMs", latestResult.segmentMergeTimeMs);
    output.set("segments", toFloat32MemoryView(latestResult.segments));
    output.set(
        "layerSegmentOffsets",
        toInt32MemoryView(latestResult.layerSegmentOffsets)
    );

    return output;
}

} // namespace

/*
 * @brief Stores a triangle mesh in native slicer memory.
 *
 * @param vertices Flat triangle vertex buffer arranged as x, y, z values. Every 9 floats represent one triangle.
 * @return Save result containing the number of stored triangle faces.
 */
inline emscripten::val saveMeshFromJavaScript(
    const emscripten::val& vertices
) {
    return toJavaScriptSaveMeshResult(
        saveMesh(toFloatVector(vertices))
    );
}

/*
 * @brief Cuts the currently saved triangle mesh into cross-section layers.
 *
 * @param planeFrame Flat plane frame arranged as origin, axisX, axisY, normal.
 * @param sliceCount Number of cross-section layers to compute.
 * @param sliceSpacing Distance between adjacent layers along the slicing normal.
 * @return Slice data and native timing measurements used by the frontend.
 */
inline emscripten::val computeSavedSliceStackFromJavaScript(
    const emscripten::val& planeFrame,
    int sliceCount,
    float sliceSpacing
) {
    const SliceStackRequest request = {
        toFloatVector(planeFrame),
        sliceCount,
        sliceSpacing,
    };

    latestResult = computeSavedSliceStack(request);

    return toJavaScriptSliceStackResult();
}

/*
 * @brief Stores a triangle mesh and immediately cuts it into cross-section layers.
 *
 * @param vertices Flat triangle vertex buffer arranged as x, y, z values. Every 9 floats represent one triangle.
 * @param planeFrame Flat plane frame arranged as origin, axisX, axisY, normal.
 * @param sliceCount Number of cross-section layers to compute.
 * @param sliceSpacing Distance between adjacent layers along the slicing normal.
 * @return Slice data and native timing measurements used by the frontend.
 */
inline emscripten::val computeSliceStackFromJavaScript(
    const emscripten::val& vertices,
    const emscripten::val& planeFrame,
    int sliceCount,
    float sliceSpacing
) {
    const SliceStackRequest request = {
        toFloatVector(planeFrame),
        sliceCount,
        sliceSpacing,
    };

    latestResult = computeSliceStack(
        toFloatVector(vertices),
        request
    );

    return toJavaScriptSliceStackResult();
}
