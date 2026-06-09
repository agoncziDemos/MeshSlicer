import * as THREE from "three";

export function placeGeometryOnGrid(geometry: THREE.BufferGeometry): void {
  geometry.computeBoundingBox();

  const box = geometry.boundingBox;
  if (!box) {
    return;
  }

  const center = new THREE.Vector3();
  box.getCenter(center);

  geometry.translate(-center.x, -box.min.y, -center.z);

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

export function getPlaneSizeFromMesh(mesh: THREE.Mesh): number {
  mesh.geometry.computeBoundingBox();

  const box = mesh.geometry.boundingBox;
  if (!box) {
    return 5;
  }

  const size = new THREE.Vector3();
  box.getSize(size);

  return Math.max(size.x, size.y, size.z) * 1.5;
}
