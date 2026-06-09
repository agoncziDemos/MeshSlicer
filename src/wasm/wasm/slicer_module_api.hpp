#pragma once

#include <emscripten/emscripten.h>
#include <emscripten/val.h>

#include <vector>

#include "../src/slicer.hpp"

/*
 * @brief Converts a JavaScript array-like object into a native float vector.
 *
 * @param values JavaScript array or typed array containing numeric values.
 * @return Native vector containing the values as floats.
 */
inline std::vector<float> toFloatVector(const emscripten::val& values) {
    const auto length = values["length"].as<unsigned int>();

    std::vector<float> result;
    result.reserve(length);

    for (unsigned int i = 0; i < length; ++i) {
        result.push_back(values[i].as<float>());
    }

    return result;
}

/*
 * @brief Converts a native float vector into a JavaScript array.
 *
 * @param values Native float vector.
 * @return JavaScript array containing the same values.
 */
inline emscripten::val toJavaScriptArray(const std::vector<float>& values) {
    emscripten::val result = emscripten::val::array();

    for (unsigned int i = 0; i < values.size(); ++i) {
        result.set(i, values[i]);
    }

    return result;
}

/*
 * @brief Converts a native int vector into a JavaScript array.
 *
 * @param values Native int vector.
 * @return JavaScript array containing the same values.
 */
inline emscripten::val toJavaScriptArray(const std::vector<int>& values) {
    emscripten::val result = emscripten::val::array();

    for (unsigned int i = 0; i < values.size(); ++i) {
        result.set(i, values[i]);
    }

    return result;
}

/*
 * @brief Cuts a triangle mesh into a sequence of cross-section layers and returns the resulting 2D line segments.
 *
 * @param vertices Flat triangle vertex buffer arranged as x, y, z values. Every 9 floats represent one triangle.
 * @param planeFrame Flat plane frame arranged as origin, axisX, axisY, normal.
 * @param sliceCount Number of cross-section layers to compute.
 * @param sliceSpacing Distance between adjacent layers along the slicing normal.
 * @return Slice data used by the frontend to draw and export the PNG layers.
 */
inline emscripten::val computeSliceStackFromJavaScript(
    const emscripten::val& vertices,
    const emscripten::val& planeFrame,
    int sliceCount,
    float sliceSpacing
) {
    const std::vector<float> nativeVertices = toFloatVector(vertices);

    const SliceStackRequest request = {
        toFloatVector(planeFrame),
        sliceCount,
        sliceSpacing,
    };

    const double computeStartMs = emscripten_get_now();

    const SliceStackResult result =
        computeSliceStack(nativeVertices, request);

    const double nativeComputeTimeMs = emscripten_get_now() - computeStartMs;

    emscripten::val output = emscripten::val::object();
    output.set("faceCount", result.faceCount);
    output.set("nativeComputeTimeMs", nativeComputeTimeMs);
    output.set("segments", toJavaScriptArray(result.segments));
    output.set("layerSegmentOffsets", toJavaScriptArray(result.layerSegmentOffsets));

    return output;
}
