import * as THREE from "three";
import JSZip from "jszip";
import "../style.css";

import { loadStlFile } from "../engine/loaders/loadStlFile.ts";
import { getPlaneSizeFromMesh } from "../engine/mesh/meshPlacement.ts";
import { PlanePlacementController } from "../engine/plane/PlanePlacementController.ts";
import { SlicingPlane } from "../engine/plane/SlicingPlane.ts";
import {
  computeSlice,
  computeSliceStack,
  type SliceResult,
  type SliceStackLayer,
  type SliceStackResult,
} from "../engine/slicing/computeSlice.ts";
import { computeWasmSliceStack } from "../engine/slicing/slicerModule.ts";
import { CrossSectionView } from "../ui/CrossSectionView.ts";
import { Toolbar, type SliceEngine } from "../ui/Toolbar.ts";
import { Viewer } from "../engine/viewer/Viewer.ts";

const EXPORT_SCALE = 5;
const EXPORT_LINE_WIDTH_PX = 2;

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app element");
}

const viewer = new Viewer(app);
const toolbar = new Toolbar(app);

const crossSectionView = new CrossSectionView(app, {
  id: "cross-section-view",
  label: "TypeScript Cross Section",
  verticalPosition: "top",
});

let currentMesh: THREE.Mesh | null = null;
let currentPlane: SlicingPlane | null = null;
let currentFileName = "slices";

const meshMaterial = new THREE.MeshStandardMaterial({
  color: 0xdddddd,
  metalness: 0.1,
  roughness: 0.65,
  side: THREE.DoubleSide,
});

function updateCrossSection(): void {
  if (!currentMesh || !currentPlane) {
    crossSectionView.clear();
    return;
  }

  const slice = computeSlice(currentMesh, currentPlane);
  crossSectionView.draw(slice, getPlaneSizeFromMesh(currentMesh));
}

const planeController = new PlanePlacementController({
  viewer,
  getMesh: () => currentMesh,
  getPlaneSize: () => {
    if (!currentMesh) {
      return 5;
    }

    return getPlaneSizeFromMesh(currentMesh);
  },
  onPlaneCreated: (plane) => {
    if (currentPlane) {
      viewer.scene.remove(currentPlane.group);
      currentPlane.dispose();
    }

    currentPlane = plane;
    viewer.scene.add(plane.group);
    updateCrossSection();
  },
  onPlaneChanged: () => {
    updateCrossSection();
  },
  setStatus: (message) => toolbar.setStatus(message),
});

toolbar.onLoadStl(async (file) => {
  toolbar.setFileLabel(`Loading ${file.name}...`);
  currentFileName = file.name.replace(/\.[^.]+$/, "") || "slices";

  const geometry = await loadStlFile(file);

  if (currentMesh) {
    viewer.scene.remove(currentMesh);
    currentMesh.geometry.dispose();
  }

  if (currentPlane) {
    viewer.scene.remove(currentPlane.group);
    currentPlane.dispose();
    currentPlane = null;
    planeController.clearPlane();
  }

  currentMesh = new THREE.Mesh(geometry, meshMaterial);
  viewer.scene.add(currentMesh);
  viewer.frameGeometry(geometry);

  crossSectionView.clear();

  toolbar.setFileLabel(file.name);
  toolbar.setStatus("");
});

toolbar.onCreatePlane(() => {
  planeController.startPlacement();
});

toolbar.onMakeVertical(() => {
  if (!currentPlane) {
    toolbar.setStatus("Create a plane first");
    return;
  }

  const targetNormal = new THREE.Vector3(0, 1, 0);
  const localPlaneNormal = new THREE.Vector3(0, 0, 1);

  currentPlane.group.quaternion.copy(
    new THREE.Quaternion().setFromUnitVectors(localPlaneNormal, targetNormal)
  );

  currentPlane.group.updateMatrixWorld(true);
  updateCrossSection();

  toolbar.setStatus("Plane normal set to Y");
});

toolbar.onSlice(async (sliceStep, sliceEngine) => {
  if (!currentMesh) {
    toolbar.setStatus("Load an STL first");
    return;
  }

  if (!currentPlane) {
    toolbar.setStatus("Create a plane first");
    return;
  }

  toolbar.setStatus(`Computing ${getSliceEngineLabel(sliceEngine)} slice stack...`);

  const computeStartMs = performance.now();

  const stack = await computeSelectedSliceStack(
    currentMesh,
    currentPlane,
    sliceStep,
    sliceEngine
  );

  const computeTimeMs = performance.now() - computeStartMs;

  console.log(
    `${getSliceEngineLabel(sliceEngine)} slice computation took ${computeTimeMs.toFixed(
      2
    )} ms`,
    stack
  );

  const segmentCount = stack.layers.reduce(
    (total, layer) => total + layer.result.segments.length,
    0
  );

  if (segmentCount === 0) {
    toolbar.setStatus(
      `${getSliceEngineLabel(sliceEngine)} generated no slice segments`
    );
    return;
  }

  toolbar.setStatus("Creating PNG zip...");

  await downloadSliceLayersAsPngZip(stack.layers, currentFileName);

  toolbar.setStatus(
    `Exported ${stack.layers.length} PNG files, ${segmentCount} segments. ` +
      `${getSliceEngineLabel(sliceEngine)} compute: ${computeTimeMs.toFixed(2)} ms`
  );
});

async function computeSelectedSliceStack(
  mesh: THREE.Mesh,
  plane: SlicingPlane,
  sliceStep: number,
  sliceEngine: SliceEngine
): Promise<SliceStackResult> {
  if (sliceEngine === "typescript") {
    return computeSliceStack(mesh, plane, sliceStep);
  }

  return await computeWasmSliceStack(mesh, plane, sliceStep);
}

function getSliceEngineLabel(sliceEngine: SliceEngine): string {
  if (sliceEngine === "typescript") {
    return "TypeScript";
  }

  return "WASM";
}

async function downloadSliceLayersAsPngZip(
  layers: SliceStackLayer[],
  baseFileName: string
): Promise<void> {
  const captureBounds = getSliceLayersBounds(layers);

  if (!captureBounds) {
    throw new Error("Failed to compute slice bounds");
  }

  const imageWidthPx = Math.max(
    1,
    Math.ceil((captureBounds.maxX - captureBounds.minX) * EXPORT_SCALE)
  );
  const imageHeightPx = Math.max(
    1,
    Math.ceil((captureBounds.maxY - captureBounds.minY) * EXPORT_SCALE)
  );

  const zip = new JSZip();
  const folderName = `${baseFileName}-slices`;
  const folder = zip.folder(folderName);

  if (!folder) {
    throw new Error("Failed to create zip folder");
  }

  const digits = Math.max(4, String(layers.length - 1).length);

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const paddedIndex = String(i).padStart(digits, "0");
    const fileName = `${baseFileName}-slice-${paddedIndex}.png`;

    const pngBlob = await createSingleSlicePng(
      layer.result,
      captureBounds,
      imageWidthPx,
      imageHeightPx
    );

    folder.file(fileName, pngBlob);
  }

  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "STORE",
  });

  downloadBlob(zipBlob, `${folderName}.zip`);
}

async function createSingleSlicePng(
  slice: SliceResult,
  captureBounds: SliceBounds,
  imageWidthPx: number,
  imageHeightPx: number
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = imageWidthPx;
  canvas.height = imageHeightPx;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Failed to create canvas context");
  }

  context.fillStyle = "white";
  context.fillRect(0, 0, imageWidthPx, imageHeightPx);

  function toCanvasX(x: number): number {
    return (x - captureBounds.minX) * EXPORT_SCALE;
  }

  function toCanvasY(y: number): number {
    return (captureBounds.maxY - y) * EXPORT_SCALE;
  }

  context.strokeStyle = "black";
  context.lineWidth = EXPORT_LINE_WIDTH_PX;
  context.lineCap = "round";
  context.lineJoin = "round";

  context.beginPath();

  for (const segment of slice.segments) {
    context.moveTo(toCanvasX(segment.a.x), toCanvasY(segment.a.y));
    context.lineTo(toCanvasX(segment.b.x), toCanvasY(segment.b.y));
  }

  context.stroke();

  return await canvasToBlob(canvas, "image/png");
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to create image blob"));
        return;
      }

      resolve(blob);
    }, type);
  });
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}

type SliceBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

function getSliceLayersBounds(layers: SliceStackLayer[]): SliceBounds | null {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const layer of layers) {
    for (const segment of layer.result.segments) {
      minX = Math.min(minX, segment.a.x, segment.b.x);
      maxX = Math.max(maxX, segment.a.x, segment.b.x);
      minY = Math.min(minY, segment.a.y, segment.b.y);
      maxY = Math.max(maxY, segment.a.y, segment.b.y);
    }
  }

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxY)
  ) {
    return null;
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
  };
}

viewer.start();
