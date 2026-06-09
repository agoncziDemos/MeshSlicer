import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { placeGeometryOnGrid } from "../mesh/meshPlacement";

const loader = new STLLoader();

export async function loadStlFile(file: File): Promise<THREE.BufferGeometry> {
  const buffer = await file.arrayBuffer();
  const geometry = loader.parse(buffer);

  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();

  placeGeometryOnGrid(geometry);

  return geometry;
}
