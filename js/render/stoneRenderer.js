import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
export class StoneRenderer {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.01, 100);
    this.camera.up.set(0, 0, 1);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    container.append(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 12;
    this.scene.add(new THREE.HemisphereLight(0xbfe8ff, 0x314d58, 2.6));
    for (const [x, y, z, color, intensity] of [
      [3, -2, 5, 0xffffff, 4],
      [-3, -1, 2, 0x89d6cd, 3],
      [0, 4, -1, 0x638bbf, 4],
    ]) {
      const light = new THREE.DirectionalLight(color, intensity);
      light.position.set(x, y, z);
      this.scene.add(light);
    }
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.view('perspective');
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.renderer.setAnimationLoop(() => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    });
  }
  resize() {
    const w = this.container.clientWidth,
      h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
  setStone(stone) {
    for (const obj of [...this.group.children]) {
      obj.geometry?.dispose();
      obj.material?.dispose();
      this.group.remove(obj);
    }
    const pos = [],
      edgePos = [];
    for (const f of stone.facets) {
      const v = f.indices.map((i) => stone.vertices[i]);
      for (let i = 1; i < v.length - 1; i++) pos.push(...v[0], ...v[i], ...v[i + 1]);
      for (let i = 0; i < v.length; i++) edgePos.push(...v[i], ...v[(i + 1) % v.length]);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geometry.computeVertexNormals();
    this.mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshPhysicalMaterial({
        color: 0x9bbdce,
        metalness: 0.35,
        roughness: 0.24,
        flatShading: true,
        side: THREE.DoubleSide,
      }),
    );
    const edges = new THREE.BufferGeometry();
    edges.setAttribute('position', new THREE.Float32BufferAttribute(edgePos, 3));
    this.edges = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0xcce9ec, transparent: true, opacity: 0.65 }),
    );
    this.group.add(this.mesh, this.edges);
    this.setOptions(this.options || {});
  }
  setOptions(options) {
    this.options = options;
    if (!this.mesh) return;
    this.mesh.material.wireframe = !!options.wireframe;
    this.mesh.material.transparent = !!options.transparent;
    this.mesh.material.opacity = options.transparent ? 0.4 : 1;
    this.mesh.material.depthWrite = !options.transparent;
    this.edges.visible = options.edges !== false;
  }
  view(name) {
    const views = {
      perspective: [3, -4, 2.6],
      crown: [0, -0.001, 5],
      pavilion: [0, -0.001, -5],
      side: [0, -5, 0],
    };
    this.camera.position.set(...views[name]);
    this.controls.target.set(0, 0, -0.15);
    this.controls.update();
  }
  dispose() {
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.setAnimationLoop(null);
    this.renderer.dispose();
  }
}
