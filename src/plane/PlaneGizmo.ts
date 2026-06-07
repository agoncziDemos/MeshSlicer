import * as THREE from "three";

export type GizmoHit =
  | { type: "translate-normal" }
  | { type: "rotate"; axis: THREE.Vector3; tangent: THREE.Vector3 };

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
          tangent: current.userData.tangent.clone(),
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

    // Invisible pick volume. Easier to grab without making the arrow huge.
    const pickMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    const pickCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(
        size * 0.06,
        size * 0.06,
        arrowLength + headLength,
        16
      ),
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
    const radius = size;
    const arcAngle = Math.PI / 30;

    // These four arrows sit on two invisible rotation circles:
    // - local X rotation circle: arrows near +Y and -Y
    // - local Y rotation circle: arrows near +X and -X
    //
    // The plane normal is local +Z, so rotating around local X/Y tilts the plane.
    // Rotation around local Z would spin the circular plane in place, which is
    // visually pointless for slicing.

    const rotateAroundX1 = this.createRotationArrow({
      color: 0xcc3333,
      axis: new THREE.Vector3(1, 0, 0),
      radius,
      startAngle: 0 - arcAngle / 2,
      endAngle: 0 + arcAngle / 2,
      circlePlane: "yz",
    });

    const rotateAroundX2 = this.createRotationArrow({
      color: 0xcc3333,
      axis: new THREE.Vector3(1, 0, 0),
      radius,
      startAngle: Math.PI - arcAngle / 2,
      endAngle: Math.PI + arcAngle / 2,
      circlePlane: "yz",
    });

    const rotateAroundY1 = this.createRotationArrow({
      color: 0x33aa33,
      axis: new THREE.Vector3(0, 1, 0),
      radius,
      startAngle: 0 - arcAngle / 2,
      endAngle: 0 + arcAngle / 2,
      circlePlane: "xz",
    });

    const rotateAroundY2 = this.createRotationArrow({
      color: 0x33aa33,
      axis: new THREE.Vector3(0, 1, 0),
      radius,
      startAngle: Math.PI - arcAngle / 2,
      endAngle: Math.PI + arcAngle / 2,
      circlePlane: "xz",
    });

    this.group.add(rotateAroundX1);
    this.group.add(rotateAroundX2);
    this.group.add(rotateAroundY1);
    this.group.add(rotateAroundY2);

    this.pickObjects.push(
      rotateAroundX1,
      rotateAroundX2,
      rotateAroundY1,
      rotateAroundY2
    );
  }

  private createRotationArrow(args: {
    color: number;
    axis: THREE.Vector3;
    radius: number;
    startAngle: number;
    endAngle: number;
    circlePlane: "yz" | "xz";
  }): THREE.Group {
    const group = new THREE.Group();
    group.userData.gizmoType = "rotate";
    group.userData.axis = args.axis;

    const midAngle = (args.startAngle + args.endAngle) / 2;

    let tangentLocal: THREE.Vector3;

    if (args.circlePlane === "yz") {
      tangentLocal = new THREE.Vector3(
        0,
        -Math.sin(midAngle),
        Math.cos(midAngle)
      );
    } else {
      tangentLocal = new THREE.Vector3(
        -Math.sin(midAngle),
        0,
        Math.cos(midAngle)
      );
    }

    if (Math.abs(args.axis.y) > 0.5) {
      tangentLocal.negate();
    }

    group.userData.tangent = tangentLocal.normalize();

    const material = new THREE.MeshBasicMaterial({
      color: args.color,
      transparent: true,
      opacity: 0.95,
    });

    const points: THREE.Vector3[] = [];
    const steps = 8;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = THREE.MathUtils.lerp(args.startAngle, args.endAngle, t);

      if (args.circlePlane === "yz") {
        points.push(
          new THREE.Vector3(
            0,
            Math.cos(angle) * args.radius,
            Math.sin(angle) * args.radius
          )
        );
      } else {
        points.push(
          new THREE.Vector3(
            Math.cos(angle) * args.radius,
            0,
            Math.sin(angle) * args.radius
          )
        );
      }
    }

    const curve = new THREE.CatmullRomCurve3(points);

    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 12, args.radius * 0.012, 8),
      material
    );

    const head = new THREE.Mesh(
      new THREE.ConeGeometry(args.radius * 0.04, args.radius * 0.085, 16),
      material
    );

    const end = curve.getPoint(1);
    const tangent = curve.getTangent(1).normalize();

    head.position.copy(end);
    head.quaternion.copy(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        tangent
      )
    );

    group.add(tube);
    group.add(head);

    // Invisible pick sphere around the small arc.
    const pickMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    const pickSphere = new THREE.Mesh(
      new THREE.SphereGeometry(args.radius * 0.12, 12, 12),
      pickMaterial
    );
    pickSphere.position.copy(curve.getPoint(0.5));
    pickSphere.userData.gizmoType = "rotate";
    pickSphere.userData.axis = args.axis;
    pickSphere.userData.tangent = tangentLocal.clone();

    group.add(pickSphere);

    return group;
  }
}