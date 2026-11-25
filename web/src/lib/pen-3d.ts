'use client';
// Bút 3D: thân tiện tròn (LatheGeometry) theo đúng profile từng loại bút, kẹp cong, đầu bấm/nắp xoay, ngòi kim loại.
// Ảnh in/khắc dán lên dải cong đúng vị trí vùng in thân + mặt kẹp (UV chuẩn, chữ đọc xuôi). Nhựa bóng / kim loại xước / chrome.
// Cảnh: 3 cây xoè nhẹ (khắc tên riêng thì mỗi cây 1 tên) + hộp quà mở có mút đen cho bút kim loại.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';
import { BOX, penBody, penGeo, penModel, type PenMethod, type PenModel } from './pen-engine';

export interface Pen3DOpts {
  model: PenModel; method: PenMethod; body: string;
  barrels: (SVGSVGElement | null)[];   // ảnh in thân cho 3 cây (khắc tên: mỗi cây 1 tên)
  clip: SVGSVGElement | null;          // ảnh in kẹp (null = không in kẹp)
  lid: SVGSVGElement | null;           // nắp hộp quà (null = không hộp)
  fontCss: string;
}

// ---------- vật liệu ----------
let brushCanvas: HTMLCanvasElement | null = null;
function brushTex(aniso: number): THREE.Texture {
  if (!brushCanvas) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 8;
    const x = c.getContext('2d')!;
    for (let i = 0; i < 512; i++) { const v = 110 + Math.random() * 70; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(i, 0, 1, 8); }
    brushCanvas = c;
  }
  const t = new THREE.CanvasTexture(brushCanvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1); t.anisotropy = aniso;
  return t;
}
function bodyMat(bodyId: string, aniso: number): THREE.Material {
  const b = penBody(bodyId);
  if (b.finish === 'plastic') return new THREE.MeshPhysicalMaterial({ color: b.hex, roughness: 0.26, clearcoat: 0.9, clearcoatRoughness: 0.1 });
  if (b.finish === 'chrome') return new THREE.MeshStandardMaterial({ color: '#E4E7EB', metalness: 1, roughness: 0.1 });
  if (b.finish === 'matte') return new THREE.MeshPhysicalMaterial({ color: b.hex, metalness: 0.35, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.5 });
  const br = brushTex(aniso);
  return new THREE.MeshStandardMaterial({ color: b.hex, metalness: 0.88, roughness: b.finish === 'champagne' ? 0.3 : 0.36, roughnessMap: br, bumpMap: br, bumpScale: 0.15 });
}
const chrome = () => new THREE.MeshStandardMaterial({ color: '#E2E5EA', metalness: 1, roughness: 0.14 });
const rubber = () => new THREE.MeshStandardMaterial({ color: '#2A2C30', roughness: 0.85 });

// ---------- hình học ----------
/** tiện tròn quanh trục Y từ các điểm [r, y] (mm) */
function lathe(pts: [number, number][], mat: THREE.Material, seg = 56): THREE.Mesh {
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(0.001, r) * S, y * S)), seg);
  const m = new THREE.Mesh(g, mat); m.castShadow = true;
  return m;
}
/** cung cong dán ảnh in quanh thân: u dọc trục (+Y), v quanh thân (v=1 hướng lên trên thế giới) */
function bandGeo(r: number, y0: number, w: number, h: number, thetaC: number, nu = 40, nv = 24): THREE.BufferGeometry {
  const span = h / r;
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= nv; j++) {
    const v = j / nv, th = thetaC + span * (0.5 - v);
    const dx = -Math.cos(th), dz = Math.sin(th);
    for (let i = 0; i <= nu; i++) {
      const u = i / nu;
      pos.push(dx * r * S, (y0 + w * u) * S, dz * r * S); nor.push(dx, 0, dz); uv.push(u, v);
    }
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
/** mặt phẳng ở x cố định (mặt trên kẹp): u dọc +Y, v=1 hướng -Z (ra xa người xem) */
function clipFace(x: number, y0: number, w: number, h: number): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const p = [[x, y0, h / 2], [x, y0 + w, h / 2], [x, y0, -h / 2], [x, y0 + w, -h / 2]].flat().map((v) => v * S);
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
  g.setIndex([0, 2, 1, 1, 2, 3]);
  return g;
}
function inkMat(tex: THREE.Texture, method: PenMethod, bodyId: string): THREE.Material {
  const off = { transparent: true, alphaTest: 0.02, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, depthWrite: false };
  if (method === 'laser') {
    const b = penBody(bodyId);
    // khắc trên sơn tối: lộ kim loại sáng (nâng nhẹ bằng emissive để không chìm vào môi trường tối); trên chrome: vết khắc xám mờ
    return b.finish === 'chrome' || b.finish === 'champagne'
      ? new THREE.MeshStandardMaterial({ map: tex, metalness: 0.2, roughness: 0.72, ...off })
      : new THREE.MeshStandardMaterial({ map: tex, metalness: 0.35, roughness: 0.36, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.16, ...off });
  }
  // mực tampon/UV: mờ (không phản chiếu loá như thân nhựa bóng) → chữ luôn đọc rõ
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0, envMapIntensity: 0.8, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.1, ...off });
}

// ---------- 1 cây bút (trục dọc Y, ngòi ở y=0) ----------
function buildPen(model: PenModel, bodyId: string, bandTex: THREE.Texture | null, clipTex: THREE.Texture | null, method: PenMethod, aniso: number): THREE.Group {
  const g = new THREE.Group();
  const G = penGeo(model);
  const md = penModel(model);
  const b = penBody(bodyId);
  const bm = bodyMat(bodyId, aniso);
  const metalTip = chrome();
  const r = G.r;
  if (model === 'click') {
    g.add(lathe([[0, 0], [0.35, 0.15], [0.45, 0.7], [0.7, 1.2], [1.4, 3.6], [1.8, 6]], metalTip));
    g.add(lathe([[1.8, 6], [2.4, 8.5], [3.6, 14], [4.4, 19.5], [4.55, 20]], bm));
    const grip: [number, number][] = [[4.55, 20]];
    for (let y = 21; y <= 42; y += 1.5) grip.push([4.62, y - 0.5], [4.78, y]); // gân cao su
    grip.push([4.9, 43]);
    g.add(lathe(grip, rubber()));
    g.add(lathe([[4.9, 43], [5.28, 43.2], [5.3, 45.8], [5.2, 46]], chrome()));
    g.add(lathe([[5.2, 46], [5.2, 128], [5.0, 129.6], [4.5, 130]], bm));
    g.add(lathe([[4.5, 130], [4.45, 130.2], [4.45, 132.8], [3.1, 133]], chrome()));
    g.add(lathe([[3.1, 133], [3.05, 138], [2.6, 139.4], [1.6, 139.9], [0, 140]], bm));
  } else if (model === 'cap') {
    g.add(lathe([[0, 0], [2.6, 0.2], [4.1, 1.4], [4.6, 3.2], [4.75, 30], [4.9, 57], [4.95, 58], [4.4, 58.2]], bm));
    g.add(lathe([[4.4, 58.2], [4.4, 137.5], [4.0, 139], [3.2, 141.2], [0, 142]], bm));
    g.add(lathe([[4.96, 56], [5.02, 56.3], [5.02, 57.7], [4.96, 58]], chrome()));
  } else if (model === 'metal') {
    g.add(lathe([[0, 0], [0.35, 0.15], [0.5, 0.8], [0.9, 2], [2.4, 9], [3.9, 18], [4.45, 24], [4.5, 26]], metalTip));
    g.add(lathe([[4.5, 26], [4.5, 49.8], [4.4, 50]], bm));
    g.add(lathe([[4.4, 50], [4.72, 50.2], [4.72, 52.3], [4.55, 52.5]], chrome()));
    g.add(lathe([[4.55, 52.5], [4.6, 53], [4.6, 123.8], [4.5, 124]], bm));
    g.add(lathe([[4.5, 124], [4.62, 124.3], [4.6, 133], [4.2, 136], [3.0, 137.6], [0, 138]], chrome()));
  } else {
    g.add(lathe([[0, 0], [0.35, 0.15], [0.5, 0.8], [0.9, 2], [2.3, 8.5], [3.8, 17], [4.25, 22], [4.3, 24]], metalTip));
    g.add(lathe([[4.3, 24], [4.3, 47.8], [4.2, 48]], bm));
    g.add(lathe([[4.2, 48], [4.52, 48.2], [4.52, 50.3], [4.35, 50.5]], chrome()));
    g.add(lathe([[4.35, 50.5], [4.4, 51], [4.4, 128.8], [4.3, 129]], bm));
    g.add(lathe([[4.3, 129], [4.48, 129.2], [4.48, 131.8], [4.1, 132]], chrome()));
    g.add(lathe([[4.1, 132], [4.15, 134.5], [3.9, 137.6], [2.6, 139.5], [0, 140]], new THREE.MeshPhysicalMaterial({ color: '#1F2124', roughness: 0.62, sheen: 0.4 })));
  }

  // kẹp: thanh mỏng cong nhẹ ở phía trên (local -X = hướng lên của thế giới)
  const [c0, c1] = G.clip;
  const cw = md.clip.h + 1.3, ct = 1.15, gap = 0.75;
  const clipMat = md.metal ? chrome() : (b.finish === 'plastic' ? new THREE.MeshPhysicalMaterial({ color: b.hex, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.12 }) : chrome());
  const capR = model === 'cap' ? 4.85 : r;
  const cx = -(capR + gap + ct / 2);
  const bar = new THREE.Mesh(new RoundedBoxGeometry(ct * S, (c1 - c0) * S, cw * S, 3, 0.5 * S), clipMat);
  bar.position.set(cx * S, ((c0 + c1) / 2) * S, 0); bar.castShadow = true;
  g.add(bar);
  // chân kẹp gắn vào thân + núm tròn đầu kẹp
  const foot = new THREE.Mesh(new RoundedBoxGeometry((gap + ct + 0.6) * S, 5 * S, cw * S, 3, 0.45 * S), clipMat);
  foot.position.set(-(capR + (gap + ct) / 2 - 0.3) * S, (c1 - 2.5) * S, 0); foot.castShadow = true;
  g.add(foot);
  const nub = new THREE.Mesh(new THREE.SphereGeometry(1 * S, 16, 12), clipMat);
  nub.scale.set(0.9, 1.4, cw / 2.2); nub.position.set((cx + 0.35) * S, (c0 + 0.6) * S, 0);
  g.add(nub);

  // ảnh in thân + kẹp
  if (bandTex) {
    const band = new THREE.Mesh(bandGeo(r + 0.025, G.band - md.barrel.w / 2, md.barrel.w, md.barrel.h, 1.02), inkMat(bandTex, method, bodyId));
    band.renderOrder = 2; g.add(band);
  }
  if (clipTex) {
    const face = new THREE.Mesh(clipFace(cx - ct / 2 - 0.02, (c0 + c1) / 2 - md.clip.w / 2, md.clip.w, md.clip.h), inkMat(clipTex, method === 'laser' && md.metal ? 'laser' : method, md.metal ? 'm-chrome' : bodyId));
    face.renderOrder = 2; g.add(face);
  }
  return g;
}

/** đặt bút nằm: trục dọc +X thế giới, kẹp hướng lên */
function lay(pen: THREE.Group, model: PenModel): THREE.Group {
  const o = new THREE.Group();
  pen.rotation.z = -Math.PI / 2; // local +Y → +X, local -X → +Y (lên)
  const G = penGeo(model);
  pen.position.set(-G.L / 2 * S, (model === 'cap' ? 4.95 : G.r + 0.1) * S, 0);
  o.add(pen);
  return o;
}

function feltTex(aniso: number): THREE.Texture {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d')!; const d = x.createImageData(128, 128);
  for (let i = 0; i < d.data.length; i += 4) { const v = 120 + Math.random() * 60; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0);
  const t = canvasTex(c, aniso); t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 2);
  return t;
}

function giftBox(lidTex: THREE.Texture, pen: THREE.Group, aniso: number): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = BOX, t = 2.2;
  const shell = new THREE.MeshPhysicalMaterial({ color: '#1B2030', roughness: 0.55, sheen: 0.5, sheenColor: new THREE.Color('#5A6788') });
  const add = (sx: number, sy: number, sz: number, x: number, y: number, z: number, m: THREE.Material) => {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(sx * S, sy * S, sz * S, 2, Math.min(0.8, sx / 3, sy / 3, sz / 3) * S), m);
    mesh.position.set(x * S, y * S, z * S); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh;
  };
  add(w, t, d, 0, t / 2, 0, shell);
  add(w, h, t, 0, h / 2, d / 2 - t / 2, shell);
  add(w, h, t, 0, h / 2, -d / 2 + t / 2, shell);
  add(t, h, d, w / 2 - t / 2, h / 2, 0, shell);
  add(t, h, d, -w / 2 + t / 2, h / 2, 0, shell);
  // mút đen + rãnh đặt bút
  const fb = feltTex(aniso);
  const foam = new THREE.MeshStandardMaterial({ color: '#17181B', roughness: 0.95, bumpMap: fb, bumpScale: 0.6 });
  const fh = h - 7;
  add(w - t * 2 - 0.4, fh, d - t * 2 - 0.4, 0, t + fh / 2, 0, foam);
  // bút nằm lún vào mút
  pen.position.y = (t + fh - 2.2) * S;
  g.add(pen);
  // nắp: tựa sau hộp, mặt in quay ra trước
  const lid = new THREE.Group();
  const lidMats = [shell, shell, shell, shell, new THREE.MeshPhysicalMaterial({ map: lidTex, roughness: 0.5, sheen: 0.4, sheenColor: new THREE.Color('#6A7798') }), shell];
  const lb = new THREE.Mesh(new THREE.BoxGeometry(w * S, d * S, 9 * S), lidMats);
  lb.castShadow = true; lid.add(lb);
  // lớp chữ vàng ánh kim (dùng chính ảnh nắp làm alpha: vàng = mực ép kim)
  lid.rotation.x = -0.32;
  lid.position.set(0, (d / 2 * Math.cos(0.32) + 1) * S, (-d / 2 - 9 - 3) * S);
  g.add(lid);
  return g;
}

export function penBuilder(o: Pen3DOpts): Builder {
  return async (aniso) => {
    const md = penModel(o.model);
    const pxB = 2048;
    const texCache = new Map<SVGSVGElement, Promise<THREE.Texture>>();
    const texOf = (el: SVGSVGElement | null) => {
      if (!el) return Promise.resolve(null);
      if (!texCache.has(el)) texCache.set(el, svgTex(el, o.fontCss, pxB, aniso, ''));
      return texCache.get(el)!;
    };
    const els = [0, 1, 2, 3].map((i) => o.barrels[i] || o.barrels[0] || null);
    const [t0, t1, t2, t3, tc, tl] = await Promise.all([texOf(els[0]), texOf(els[1]), texOf(els[2]), texOf(els[3]), texOf(o.clip), o.lid ? svgTex(o.lid, o.fontCss, 1600, aniso) : Promise.resolve(null)]);
    const g = new THREE.Group();
    const withBox = !!(o.lid && tl && md.metal);
    // khắc tên riêng: cây trong hộp = tên 1, 3 cây xoè = tên 2–4
    const bands = withBox ? [t1, t2, t3] : [t0, t1, t2];
    // 3 cây xoè nhẹ phía trước
    const fan = [{ z: 19, rot: 0.08, x: 9 }, { z: 0, rot: 0, x: 0 }, { z: -19, rot: -0.08, x: -9 }]; // cây trước lệch phải → kẹp không che chữ cây sau
    fan.forEach((f, i) => {
      const p = lay(buildPen(o.model, o.body, bands[i], tc, o.method, aniso), o.model);
      p.rotation.y = f.rot; p.position.set(f.x * S, 0, (f.z + (withBox ? 40 : 0)) * S);
      g.add(p);
    });
    if (withBox && tl) {
      const pen = lay(buildPen(o.model, o.body, t0, tc, o.method, aniso), o.model);
      const box = giftBox(tl, pen, aniso);
      box.position.set(0, 0, -24 * S);
      g.add(box);
    }
    return {
      group: g,
      view: withBox ? { az: 0.16, el: 0.72 } : { az: 0.14, el: 0.62 },
      aim: withBox ? 0.25 : 0.2,
      zoom: withBox ? 1.22 : 1.5,
      blob: 0.35,
    };
  };
}
