import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export class Viewer {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;

  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly grid: THREE.GridHelper;

  constructor(app: HTMLDivElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf5f5f5);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.001,
      10000
    );
    this.camera.position.set(3, 3, 5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    app.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = false;

    this.grid = new THREE.GridHelper(10, 10);
    this.scene.add(this.grid);

    const axes = new THREE.AxesHelper(3);
    this.scene.add(axes);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 2.0);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(5, 10, 7);
    this.scene.add(dirLight);

    window.addEventListener("resize", () => this.onResize());
  }

  get domElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  setControlsEnabled(enabled: boolean): void {
    this.controls.enabled = enabled;
  }

  pickPointOnMesh(event: PointerEvent, mesh: THREE.Mesh): THREE.Vector3 | null {
    this.setPointerFromEvent(event);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const hits = this.raycaster.intersectObject(mesh, false);

    if (hits.length === 0) {
      return null;
    }

    return hits[0].point.clone();
  }

  pickObjects(
    event: PointerEvent,
    objects: THREE.Object3D[]
  ): THREE.Intersection[] {
    this.setPointerFromEvent(event);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    return this.raycaster.intersectObjects(objects, true);
  }

  frameGeometry(geometry: THREE.BufferGeometry): void {
    geometry.computeBoundingSphere();

    const sphere = geometry.boundingSphere;
    if (!sphere) {
      return;
    }

    const radius = sphere.radius;
    const distance = Math.max(radius * 2.5, 2);

    this.camera.position.set(distance, distance, distance);
    this.camera.near = Math.max(radius / 1000, 0.001);
    this.camera.far = Math.max(radius * 1000, 1000);
    this.camera.updateProjectionMatrix();

    this.controls.target.set(0, 0, 0);
    this.controls.update();

    this.grid.scale.setScalar(Math.max(radius, 1));
  }

  start(): void {
    const animate = () => {
      requestAnimationFrame(animate);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  private setPointerFromEvent(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();

    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
