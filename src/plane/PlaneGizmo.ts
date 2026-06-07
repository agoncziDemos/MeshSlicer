import * as THREE from "three";

export type GizmoHit =
  | { type: "translate-normal" }
  | { type: "rotate"; axis: THREE.Vector3 };

export class PlaneGizmo {
  readonly group: THREE.Group;
  readonly pickObjects: THREE.Object3D[] = [];

  constructor(size: number) {
    this.group = new THREE.Group();

    this.addNormalTranslateArrow(size);
    this.addRotationArrows(size);
  }

  getHitFromObject(object: THREE.Object3D): GizmoHit | null {
    let current: THREE.Object3D | null = object;

    while (current) {
      if (current.userData.gizmoType === "translate-normal") {
        return { type: "translate-normal" };
      }

      if (current.userData.gizmoType === "rotate") {
        return {
          type: "rotate",
          axis: current.userData.axis.clone(),
        };
      }

      current = current.parent;
    }

    return null;
  }

  private addNormalTranslateArrow(size: number): void {
    const material = new THREE.MeshBasicMaterial({
        color: 0x222222,
    });

    // Visible arrow - bigger than before, but still not huge.
    const arrowLength = size * 0.28;
    const shaftRadius = size * 0.008;
    const headRadius = size * 0.028;
    const headLength = size * 0.075;

    const arrowGroup = new THREE.Group();
    arrowGroup.userData.gizmoType = "translate-normal";

    const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(shaftRadius, shaftRadius, arrowLength, 16),
        material
    );
    shaft.rotation.x = Math.PI / 2;
    shaft.position.z = arrowLength / 2;

    const head = new THREE.Mesh(
        new THREE.ConeGeometry(headRadius, headLength, 20),
        material
    );
    head.rotation.x = Math.PI / 2;
    head.position.z = arrowLength + headLength / 2;

    arrowGroup.add(shaft);
    arrowGroup.add(head);

    // Invisible pick volume - makes the arrow much easier to click
    // without making it visually enormous.
    const pickMaterial = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
    });

    const pickCylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(size * 0.055, size * 0.055, arrowLength + headLength, 16),
        pickMaterial
    );
    pickCylinder.rotation.x = Math.PI / 2;
    pickCylinder.position.z = (arrowLength + headLength) / 2;
    pickCylinder.userData.gizmoType = "translate-normal";

    arrowGroup.add(pickCylinder);

    this.group.add(arrowGroup);
    this.pickObjects.push(arrowGroup);
    }

  private addRotationArrows(size: number): void {
    const offset = size * 0.58;
    const arcRadius = size * 0.07;

    const xArrow = this.createRotationArrow(
      0xcc3333,
      new THREE.Vector3(1, 0, 0),
      arcRadius
    );
    xArrow.position.set(offset, 0, 0);
    xArrow.rotation.y = Math.PI / 2;

    const yArrow = this.createRotationArrow(
      0x33aa33,
      new THREE.Vector3(0, 1, 0),
      arcRadius
    );
    yArrow.position.set(0, offset, 0);
    yArrow.rotation.x = -Math.PI / 2;

    const zArrow = this.createRotationArrow(
      0x3333cc,
      new THREE.Vector3(0, 0, 1),
      arcRadius
    );
    zArrow.position.set(0, 0, offset);

    this.group.add(xArrow);
    this.group.add(yArrow);
    this.group.add(zArrow);

    this.pickObjects.push(xArrow, yArrow, zArrow);
  }

  private createRotationArrow(
    color: number,
    axis: THREE.Vector3,
    radius: number
  ): THREE.Group {
    const group = new THREE.Group();
    group.userData.gizmoType = "rotate";
    group.userData.axis = axis;

    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
    });

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(radius, 0, 0),
      new THREE.Vector3(radius * 0.92, radius * 0.28, 0),
      new THREE.Vector3(radius * 0.75, radius * 0.5, 0),
    ]);

    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 12, radius * 0.055, 8),
      material
    );

    const head = new THREE.Mesh(
      new THREE.ConeGeometry(radius * 0.14, radius * 0.28, 12),
      material
    );

    const end = curve.getPoint(1);
    const tangent = curve.getTangent(1).normalize();

    head.position.copy(end);

    // Cone points along local +Y by default. Align +Y to the curve tangent.
    head.quaternion.copy(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        tangent
      )
    );

    group.add(tube);
    group.add(head);

    return group;
  }
}
