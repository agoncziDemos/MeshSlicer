#include <emscripten/bind.h>

#include "slicer_module_api.hpp"

EMSCRIPTEN_BINDINGS(slicer_module) {
    emscripten::function(
        "computeSliceStack",
        &computeSliceStackFromJavaScript
    );
}
