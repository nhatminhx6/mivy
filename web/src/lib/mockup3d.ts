'use client';
// LÕI ẢNH THÀNH PHẨM 3D (three.js) dùng chung cho mọi sản phẩm in: hộp/túi, card visit, standee…
// Mỗi sản phẩm chỉ viết 1 "builder" dựng mô hình (Group); lõi lo đèn studio, bóng mềm, khung nhìn, xoay, chụp ảnh.
// Render 100% trên máy khách, không gọi AI. Chỉ import động từ component client (three không vào bundle đầu trang).

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { drawWatermark } from './design-engine';
import { selfContainedSvg, svgToCanvas } from './svg-export';

export const S = 0.01; // 1mm = 0.01 đơn vị 3D
export const STUDIO_BG = ['#F7F5F1', '#E5E0D7'] as const;

export interface View { az: number; el: number }
export interface Built {
  group: THREE.Group;   // mô hình, đáy chạm y = 0
  view: View;           // góc nhìn mặc định
  aim?: number;         // điểm nhìn theo chiều cao (0 = đáy, 1 = đỉnh), mặc định 0.48
  zoom?: number;        // >1 = gần hơn
  blob?: number;        // độ đậm bóng chạm đất (mặc định 1; vật mỏng nằm phẳng như card thì 0)
  swing?: number;       // đồ treo tường / dán mặt phẳng: chỉ xoay ±swing rad quanh góc mặc định (tự lắc qua lại, không lộ mặt sau)
}
export type Builder = (aniso: number) => Promise<Built> | Built;

// ---------- tiện ích texture ----------
export function canvasTex(c: HTMLCanvasElement, aniso: number): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}

// SVG đang hiện trên trang (thiết kế của khách) → texture (font + ảnh đã nhúng)
export async function svgTex(el: SVGSVGElement, fontCss: string | undefined, outW: number, aniso: number, bg = '#FFFFFF'): Promise<THREE.CanvasTexture> {
  const vb = el.viewBox.baseVal;
  const outH = Math.max(4, Math.round((outW * vb.height) / vb.width));
  const c = await svgToCanvas(await selfContainedSvg(el, fontCss), outW, outH, bg);
  return canvasTex(c, aniso);
}

export const isDark = (hex: string) => {
  const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 110;
};

// ống tròn nối 2 điểm (khung standee, chân đế…)
export function rod(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material): THREE.Mesh {
  const len = a.distanceTo(b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 14), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  m.castShadow = true;
  return m;
}

export const aluminium = () => new THREE.MeshStandardMaterial({ color: '#C9CDD3', metalness: 0.85, roughness: 0.32 });
export const darkMetal = () => new THREE.MeshStandardMaterial({ color: '#2A2E35', metalness: 0.5, roughness: 0.45 });

// ---------- sân khấu: đèn softbox, bóng mềm, bóng chạm đất ----------
function contactShadow(w: number, d: number): THREE.Mesh {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.55, 'rgba(0,0,0,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.45, d * 1.45), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.0004;
  return m;
}

const envCache = new WeakMap<THREE.WebGLRenderer, THREE.Texture>();
function envFor(renderer: THREE.WebGLRenderer): THREE.Texture {
  let t = envCache.get(renderer);
  if (!t) {
    const pm = new THREE.PMREMGenerator(renderer);
    t = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    envCache.set(renderer, t);
  }
  return t;
}

interface Stage { scene: THREE.Scene; built: Built }

function makeStage(renderer: THREE.WebGLRenderer, built: Built): Stage {
  const scene = new THREE.Scene();
  scene.environment = envFor(renderer);
  scene.environmentIntensity = 0.62;
  scene.add(built.group);

  const bb = new THREE.Box3().setFromObject(built.group);
  const size = bb.getSize(new THREE.Vector3());
  const c = bb.getCenter(new THREE.Vector3());
  const R = Math.max(size.x, size.y, size.z);

  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(c.x - R * 1.0, R * 3.6, c.z + R * 1.5);
  key.target.position.set(c.x, 0, c.z);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  const sc = key.shadow.camera; sc.left = -R * 1.4; sc.right = R * 1.4; sc.top = R * 1.4; sc.bottom = -R * 1.4; sc.near = 0.01; sc.far = R * 8;
  key.shadow.radius = 14; key.shadow.blurSamples = 20; key.shadow.bias = -0.0006;
  const rim = new THREE.DirectionalLight(0xfff4e6, 0.55); rim.position.set(c.x + R * 2, R * 1.4, c.z - R * 1.6);
  const fill = new THREE.HemisphereLight(0xffffff, 0xd8d0c2, 0.35);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(R * 20, R * 20), new THREE.ShadowMaterial({ opacity: 0.12 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(key, key.target, rim, fill, ground);
  if ((built.blob ?? 1) > 0) {
    const blob = contactShadow(Math.max(size.x, R * 0.05), Math.max(size.z, R * 0.05));
    blob.position.x = c.x; blob.position.z = c.z;
    (blob.material as THREE.MeshBasicMaterial).opacity = built.blob ?? 1;
    scene.add(blob);
  }
  return { scene, built };
}

export function disposeTree(o: THREE.Object3D) {
  const seen = new Set<unknown>();
  o.traverse((n) => {
    const m = n as THREE.Mesh;
    if (m.geometry && !seen.has(m.geometry)) { seen.add(m.geometry); m.geometry.dispose(); }
    const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
    for (const mt of mats) {
      if (seen.has(mt)) continue; seen.add(mt);
      // giải phóng MỌI texture của vật liệu (map, bumpMap, roughnessMap, alphaMap, iridescenceMap…), không chỉ .map
      for (const v of Object.values(mt)) {
        if (v instanceof THREE.Texture && !seen.has(v)) { seen.add(v); v.dispose(); }
      }
      mt.dispose();
    }
  });
}

function frame(camera: THREE.PerspectiveCamera, built: Built, v: View): THREE.Vector3 {
  const box = new THREE.Box3().setFromObject(built.group);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
  const dist = (sphere.radius / Math.sin(Math.min(vfov, hfov) / 2)) * 1.1 / (built.zoom ?? 1);
  const target = new THREE.Vector3(sphere.center.x, box.min.y + (box.max.y - box.min.y) * (built.aim ?? 0.48), sphere.center.z);
  camera.position.set(
    target.x + dist * Math.cos(v.el) * Math.sin(v.az),
    target.y + dist * Math.sin(v.el),
    target.z + dist * Math.cos(v.el) * Math.cos(v.az),
  );
  camera.near = dist / 50; camera.far = dist * 10; camera.updateProjectionMatrix();
  camera.lookAt(target);
  return target;
}

function setupRenderer(r: THREE.WebGLRenderer) {
  r.toneMapping = THREE.NeutralToneMapping; // tone-map chuẩn ảnh sản phẩm: giữ đúng màu in
  r.toneMappingExposure = 1.0;
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.VSMShadowMap;
  r.setClearColor(0x000000, 0);
}

function paintBg(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, STUDIO_BG[0]); g.addColorStop(1, STUDIO_BG[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const rg = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, Math.max(W, H) * 0.6);
  rg.addColorStop(0, 'rgba(255,255,255,0.55)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
}

// ---------- ảnh chụp (thumbnail, PNG, ảnh gửi kèm đơn) ----------
let shared: THREE.WebGLRenderer | null = null;
function sharedRenderer(): THREE.WebGLRenderer {
  if (!shared) {
    shared = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    shared.setPixelRatio(1);
    setupRenderer(shared);
  }
  return shared;
}

export async function snapshot(builder: Builder, w: number, h: number, opts: { view?: View; watermark?: boolean } = {}): Promise<HTMLCanvasElement> {
  const r = sharedRenderer();
  const built = await builder(r.capabilities.getMaxAnisotropy());
  // từ đây chạy đồng bộ → các lần chụp song song không giẫm renderer dùng chung
  r.setSize(w, h, false);
  const st = makeStage(r, built);
  const cam = new THREE.PerspectiveCamera(26, w / h, 0.01, 100);
  frame(cam, built, opts.view ?? built.view);
  r.render(st.scene, cam);
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  const ctx = out.getContext('2d')!;
  paintBg(ctx, w, h);
  ctx.drawImage(r.domElement, 0, 0, w, h);
  disposeTree(st.scene);
  if (opts.watermark) drawWatermark(out);
  return out;
}

// ---------- khung xem kéo xoay ----------
export interface Viewer { update(b: Builder, refit: boolean): Promise<void>; view(): View | undefined; dispose(): void }

export function createViewer(el: HTMLElement, builder: Builder, onError?: (e: unknown) => void, onFirstFrame?: () => void): Viewer {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  setupRenderer(renderer);
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const cnv = renderer.domElement;
  Object.assign(cnv.style, { width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: 'grab' });
  el.appendChild(cnv);

  const cam = new THREE.PerspectiveCamera(26, 1, 0.01, 100);
  const controls = new OrbitControls(cam, cnv);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI * 0.49; controls.minPolarAngle = Math.PI * 0.04;
  controls.autoRotate = true; controls.autoRotateSpeed = 1.1;
  let touched = false; // khách đã tự kéo xoay chưa → chụp ảnh theo góc khách chọn; chưa thì dùng góc mặc định
  controls.addEventListener('start', () => { touched = true; controls.autoRotate = false; cnv.style.cursor = 'grabbing'; });
  controls.addEventListener('end', () => { cnv.style.cursor = 'grab'; });

  let st: Stage | null = null;
  let seq = 0, dead = false;

  const resize = () => {
    const w = el.clientWidth || 1, h = el.clientHeight || 1;
    renderer.setSize(w, h, false);
    cam.aspect = w / h; cam.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize); ro.observe(el); resize();

  const currentView = (): View => ({ az: controls.getAzimuthalAngle(), el: Math.PI / 2 - controls.getPolarAngle() });
  let swing = 0;
  let defView: View | undefined;
  const fit = (built: Built, v: View) => {
    swing = built.swing ?? 0; defView = built.view;
    controls.minAzimuthAngle = swing ? built.view.az - swing : -Infinity;
    controls.maxAzimuthAngle = swing ? built.view.az + swing : Infinity;
    const t = frame(cam, built, v);
    controls.target.copy(t);
    const dist = cam.position.distanceTo(t);
    controls.minDistance = dist * 0.45; controls.maxDistance = dist * 1.8;
    controls.update();
  };

  // dựng lại mô hình (bất đồng bộ); lần gọi cũ về muộn thì bỏ
  const apply = async (b: Builder, refit: boolean) => {
    const my = ++seq;
    let built: Built;
    try { built = await b(aniso); } catch (e) { onError?.(e); return; }
    if (dead || my !== seq) { disposeTree(built.group); return; }
    const keep = st ? currentView() : null;
    if (st) disposeTree(st.scene);
    st = makeStage(renderer, built);
    fit(built, refit || !keep ? built.view : keep);
    if (!keep) onFirstFrame?.();
  };

  let raf = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop); if (!st) return;
    if (swing && controls.autoRotate) {
      // tới biên thì đổi chiều → lắc qua lại trước mặt sản phẩm
      const az = controls.getAzimuthalAngle(), lo = controls.minAzimuthAngle + 0.02, hi = controls.maxAzimuthAngle - 0.02;
      if (az <= lo) controls.autoRotateSpeed = -Math.abs(controls.autoRotateSpeed);
      else if (az >= hi) controls.autoRotateSpeed = Math.abs(controls.autoRotateSpeed);
    }
    controls.update(); renderer.render(st.scene, cam);
  };
  loop();
  void apply(builder, true);

  return {
    update: apply,
    // chưa dựng xong / chưa ai kéo (đang tự xoay, có thể lộ mặt sau) → trả góc mặc định của mô hình
    view: () => (st && touched ? currentView() : defView),
    dispose() {
      dead = true; cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      if (st) disposeTree(st.scene);
      renderer.dispose(); cnv.remove();
    },
  };
}
