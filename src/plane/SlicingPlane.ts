import * as THREE from "three";
import { PlaneGizmo } from "./PlaneGizmo.ts";

export class SlicingPlane {
  readonly group: THREE.Group;
  readonly gizmo: PlaneGizmo;
  readonly dragPickObjects: THREE.Object3D[];

  private readonly planeMesh: THREE.Mesh;

  constructor(origin: THREE.Vector3, normal: THREE.Vector3, size: number) {
    this.group = new THREE.Group();
    this.group.position.copy(origin);

    const localNormal = new THREE.Vector3(0, 0, 1);
    this.group.quaternion.copy(
      new THREE.Quaternion().setFromUnitVectors(localNormal, normal.clone().normalize())
    );

   const planeGeometry = new THREE.CircleGeometry(size, 96);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
    this.dragPickObjects = [this.planeMesh];
    this.group.add(this.planeMesh);

    this.gizmo = new PlaneGizmo(size);
    this.group.add(this.gizmo.group);
  }

  getNormalWorld(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, 1)
      .applyQuaternion(this.group.quaternion)
      .normalize();
  }

  dispose(): void {
    this.group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();

        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }
}
