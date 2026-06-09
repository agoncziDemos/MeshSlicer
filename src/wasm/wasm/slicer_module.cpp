#include <emscripten/bind.h>

#include "slicer_module_api.hpp"

EMSCRIPTEN_BINDINGS(slicer_module) {
    emscripten::function(
        "saveMesh",
        &saveMeshFromJavaScript
    );

    emscripten::function(
        "computeSavedSliceStack",
        &computeSavedSliceStackFromJavaScript
    );

    emscripten::function(
        "computeSliceStack",
        &computeSliceStackFromJavaScript
    );
}
