#pragma once

#include <emscripten/val.h>

#include <vector>

#include "../src/slicer.hpp"

/*
 * @brief Converts a JavaScript array-like object into a native float vector.
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
 * @brief JavaScript-facing slice stack computation entry point.
 * @param vertices JavaScript array or typed array containing a flat triangle vertex buffer.
 * @param planeFrame JavaScript array or typed array arranged as origin, axisX, axisY, normal.
 * @param sliceCount Number of slices to compute.
 * @param sliceSpacing Distance between adjacent slices.
 * @return JavaScript object containing face count, flat segments, and layer segment offsets.
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

    const SliceStackResult result =
        computeSliceStack(toFloatVector(vertices), request);

    emscripten::val output = emscripten::val::object();
    output.set("faceCount", result.faceCount);
    output.set("segments", toJavaScriptArray(result.segments));
    output.set("layerSegmentOffsets", toJavaScriptArray(result.layerSegmentOffsets));

    return output;
}
