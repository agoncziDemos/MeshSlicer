cmake_minimum_required(VERSION 3.20)

project(MeshSlicerWasm LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_executable(slicer
  src/slicer.cpp
  src/utils/vec3.cpp
  src/utils/slicer_geometry.cpp
  src/utils/slicer_sweep.cpp
  wasm/slicer_module.cpp
)

target_include_directories(slicer PRIVATE
  ${CMAKE_CURRENT_SOURCE_DIR}/src
  ${CMAKE_CURRENT_SOURCE_DIR}/wasm
)

if(EMSCRIPTEN)
  target_compile_options(slicer PRIVATE
    -O3
  )

  target_link_options(slicer PRIVATE
    "SHELL:-O3"
    "SHELL:--bind"
    "SHELL:-s MODULARIZE=1"
    "SHELL:-s EXPORT_ES6=1"
    "SHELL:-s ENVIRONMENT=web"
    "SHELL:-s ALLOW_MEMORY_GROWTH=1"
  )
endif()

set_target_properties(slicer PROPERTIES
  RUNTIME_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/dist
  OUTPUT_NAME slicer
  SUFFIX ".js"
)
