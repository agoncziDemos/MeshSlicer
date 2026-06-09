# MeshSlicer Demo

MeshSlicer Demo is a browser-based demo for interactive STL slicing. It loads a triangle mesh, lets the user place and orient a slicing plane, computes parallel cross-section layers, and exports the generated slices as PNG files.

The project is meant to show a deployable geometry-processing application that combines browser visualization, computational geometry, TypeScript, C++, WebAssembly, Emscripten, and CMake. The same slicing workflow can run through a TypeScript implementation or through a C++ module compiled to WASM, demonstrating how native geometry code can be integrated into a modern frontend application.

## Features

* Load STL triangle meshes in the browser.
* Display the mesh in a Three.js viewer.
* Interactively create and adjust a slicing plane.
* Preview a single cross-section in 2D.
* Compute a full stack of parallel slice layers.
* Toggle between TypeScript and C++/WASM slicing.
* Export generated slice layers as PNG files in a zip archive.
* Print timing information for development and inspection.

## Tech Stack

* TypeScript
* Three.js
* Vite
* C++20
* WebAssembly
* Emscripten
* CMake
* JSZip

## Project Structure

```text
src/
  app/
    main.ts                     Browser app entry point.

  engine/
    loaders/                    STL loading.
    mesh/                       Mesh sizing and placement helpers.
    plane/                      Interactive slicing plane logic.
    slicing/                    TypeScript slicer and WASM wrapper.
    viewer/                     Three.js viewer.

  ui/
    Toolbar.ts                  UI controls.
    CrossSectionView.ts         2D slice preview.

  types/
    slicer-module.d.ts          TypeScript declarations for the WASM module.

  wasm/
    CMakeLists.txt              C++/Emscripten build configuration.

    src/
      slicer.hpp/.cpp           Native slicer API and orchestration.

      utils/
        vec3.hpp/.cpp           Basic vector math.
        triangle_buffer.hpp/.cpp
                                  Flat triangle-buffer helpers.
        slicer_geometry.hpp/.cpp
                                  Triangle-plane intersection and projection.
        slicer_stack.hpp/.cpp   Slice-index and triangle-range helpers.
        slicer_sweep.hpp/.cpp   Active-triangle sweep implementation.
        slicer_candidates.hpp/.cpp
                                  Candidate-list implementation with parallel slice generation.

    wasm/
      slicer_module.cpp         Emscripten binding registration.
      slicer_module_api.hpp     JavaScript/C++ conversion boundary.
```

## How It Works

The mesh is converted into a flat triangle buffer. The slicer checks which triangles can intersect each layer, computes triangle-plane intersections, projects the results into the slicing plane, and exports the resulting 2D line segments as PNG slice images.

There are two implementations of the slicing path:

* The TypeScript slicer runs directly in the browser.
* The C++ slicer is compiled to WebAssembly and called from TypeScript.

The WASM path is included to show the full native-code integration: C++ geometry code, CMake build setup, Emscripten bindings, module loading, and TypeScript interop inside a browser app.

## Build

Install dependencies:

```bash
npm install
```

Build the WASM slicer:

```bash
cd src/wasm
emcmake cmake -S . -B build
cmake --build build --config Release
```

Run the app:

```bash
npm run dev
```

The generated WASM module is written to:

```text
src/wasm/dist/
```

The Vite config sets the cross-origin isolation headers needed for Emscripten pthreads.

## Usage

1. Load an STL file.
2. Create a slicing plane.
3. Adjust the slice step.
4. Choose TypeScript or WASM.
5. Click Slice.
6. Download the PNG zip.

## Current Limitations

* The output is raw line segments, not reconstructed closed contours.
* The mesh is copied into a flat buffer before entering WASM.
* The WASM result is converted back into JavaScript arrays before export.
* PNG generation is separate from the slicing computation.

## Future Work

* Reconstruct connected contours from raw slice segments.
* Add tests comparing TypeScript and WASM output.
* Return typed arrays or WASM memory views instead of JavaScript arrays.
* Add benchmark meshes and repeatable timing runs.
* Deploy the demo with GitHub Pages.

## License

No license has been selected yet.
