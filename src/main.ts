import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app element");
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf5f5f5);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.001,
  10000
);
camera.position.set(3, 3, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
app.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const grid = new THREE.GridHelper(10, 10);
scene.add(grid);

const axes = new THREE.AxesHelper(3);
scene.add(axes);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 2.0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

const loader = new STLLoader();

let currentMesh: THREE.Mesh | null = null;
let currentWireframe: THREE.Mesh | null = null;

const meshMaterial = new THREE.MeshStandardMaterial({
  color: 0xdddddd,
  metalness: 0.1,
  roughness: 0.65,
  side: THREE.DoubleSide,
});

const wireMaterial = new THREE.MeshBasicMaterial({
  color: 0x222222,
  wireframe: true,
  transparent: true,
  opacity: 0.15,
});

const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = ".stl";
fileInput.style.display = "none";

const loadButton = document.createElement("button");
loadButton.textContent = "Load STL";
loadButton.id = "load-button";

const fileLabel = document.createElement("span");
fileLabel.id = "file-label";
fileLabel.textContent = "No file loaded";

const toolbar = document.createElement("div");
toolbar.id = "toolbar";
toolbar.appendChild(loadButton);
toolbar.appendChild(fileLabel);
toolbar.appendChild(fileInput);
app.appendChild(toolbar);

loadButton.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];

  if (!file) {
    return;
  }

  fileLabel.textContent = `Loading ${file.name}...`;

  const buffer = await file.arrayBuffer();
  const geometry = loader.parse(buffer);
  geometry.rotateX(-Math.PI / 2);

  geometry.computeVertexNormals();

  centerGeometry(geometry);
  displayGeometry(geometry);
  frameObject(geometry);

  fileLabel.textContent = file.name;
});

function centerGeometry(geometry: THREE.BufferGeometry) {
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

function displayGeometry(geometry: THREE.BufferGeometry) {
  if (currentMesh) {
    scene.remove(currentMesh);
    currentMesh.geometry.dispose();
  }

  if (currentWireframe) {
    scene.remove(currentWireframe);
    currentWireframe.geometry.dispose();
  }

  currentMesh = new THREE.Mesh(geometry, meshMaterial);
  scene.add(currentMesh);

  currentWireframe = new THREE.Mesh(geometry.clone(), wireMaterial);
  scene.add(currentWireframe);
}

function frameObject(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingSphere();

  const sphere = geometry.boundingSphere;
  if (!sphere) {
    return;
  }

  const radius = sphere.radius;
  const distance = Math.max(radius * 2.5, 2);

  camera.position.set(distance, distance, distance);
  camera.near = Math.max(radius / 1000, 0.001);
  camera.far = Math.max(radius * 1000, 1000);
  camera.updateProjectionMatrix();

  controls.target.set(0, 0, 0);
  controls.update();

  grid.scale.setScalar(Math.max(radius, 1));
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("resize", onResize);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();
