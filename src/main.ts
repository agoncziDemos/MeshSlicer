import * as THREE from "three";
import "./style.css";

import { loadStlFile } from "./loaders/loadStlFile.ts";
import { getPlaneSizeFromMesh } from "./mesh/meshPlacement.ts";
import { PlanePlacementController } from "./plane/PlanePlacementController.ts";
import { SlicingPlane } from "./plane/SlicingPlane.ts";
import { computeSlice } from "./slicing/computeSlice.ts";
import { CrossSectionView } from "./ui/CrossSectionView.ts";
import { Toolbar } from "./ui/Toolbar.ts";
import { Viewer } from "./viewer/Viewer.ts";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app element");
}

const viewer = new Viewer(app);
const toolbar = new Toolbar(app);
const crossSectionView = new CrossSectionView(app);

let currentMesh: THREE.Mesh | null = null;
let currentPlane: SlicingPlane | null = null;

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

viewer.start();
