import { defineConfig } from "vite";

const crossOriginIsolationHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

export default defineConfig({
  base: "/MeshSlicer/",

  server: {
    headers: crossOriginIsolationHeaders,
  },

  preview: {
    headers: crossOriginIsolationHeaders,
  },
});
