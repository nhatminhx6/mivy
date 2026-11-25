'use client';
// Mũ lưỡi trai 3D: chóp 6 múi dựng tham số (siêu-elip, phồng giữa múi, đường may nổi, khuy thoáng, nút chóp),
// vành cong/phẳng có độ dày + hàng chỉ may, lỗ sau + dây khoá, mặt lưới (trucker) bằng alphaMap.
// Hình thêu/in = decal bám đúng mặt cong theo độ dài cung (mm thật) → vị trí trên mũ khớp file thêu.

import * as THREE from 'three';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';
import { capShade, type CapKind, type CapMethod, type CapPos } from './cap-engine';

export interface Cap3DOpts {
  kind: CapKind; crown: string; visor: string; method: CapMethod; fontCss: string;
  arts: Partial<Record<CapPos, SVGSVGElement | null>>;
}

interface K { a: number; b: number; h: number; p0: number; pf: number; shift: number; D: number; curv: number; tilt: number; vth: number; trucker: boolean; kind: CapKind }
const KINDS: Record<CapKind, Omit<K, 'trucker' | 'kind'>> = {
  dad: { a: 98, b: 84, h: 100, p0: 2.1, pf: 0.35, shift: -12, D: 80, curv: 0.5, tilt: 0.14, vth: (78 * Math.PI) / 180 },
  trucker: { a: 98, b: 85, h: 114, p0: 2.45, pf: 0.75, shift: -7, D: 78, curv: 0.4, tilt: 0.1, vth: (78 * Math.PI) / 180 },
  snap: { a: 98, b: 85, h: 118, p0: 2.6, pf: 0.85, shift: -5, D: 78, curv: 0.04, tilt: 0.04, vth: (79 * Math.PI) / 180 },
};
const SEAM = Math.PI / 3;
const OPEN_A = (25 * Math.PI) / 180; // nửa góc lỗ sau
const OPEN_P = 0.27;                 // chiều cao lỗ sau (theo phi)
const PH_MAX = 0.999;
const wrapPi = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));
const openA = (ph: number) => (ph >= OPEN_P ? 0 : OPEN_A * Math.sqrt(1 - (ph / OPEN_P) ** 2));

// ---------- mặt chóp ----------
function crownPt(k: K, th: number, ph: number, out = new THREE.Vector3()): THREE.Vector3 {
  const cf = Math.max(0, Math.cos(th));
  const p = k.p0 + k.pf * cf;
  const c = Math.pow(Math.max(0, 1 - Math.pow(ph, p)), 1 / p);
  let seg: number;
  if (k.trucker && Math.abs(wrapPi(th)) < SEAM) seg = (wrapPi(th) + SEAM) / (2 * SEAM);
  else seg = ((((th % SEAM) + SEAM) % SEAM) / SEAM);
  const bul = 1 + 0.03 * Math.sin(Math.PI * seg) * Math.sin(Math.PI * Math.min(1, ph * 1.15));
  const hh = k.h * (1 + 0.05 * Math.cos(th) * (1 - ph ** 3));
  out.set(k.b * c * Math.sin(th) * bul, hh * ph, k.a * c * Math.cos(th) * bul + k.shift * ph * ph);
  return out;
}
function crownNormal(k: K, th: number, ph: number): THREE.Vector3 {
  const e = 1e-3;
  const p = crownPt(k, th, ph);
  const dt = crownPt(k, th + e, ph).sub(crownPt(k, th - e, ph));
  const dp = crownPt(k, th, Math.min(PH_MAX, ph + e)).sub(crownPt(k, th, Math.max(0, ph - e)));
  const n = new THREE.Vector3().crossVectors(dt, dp).normalize();
  const axis = new THREE.Vector3(0, p.y, k.shift * ph * ph);
  if (n.dot(p.clone().sub(axis)) < 0) n.negate();
  return n;
}
// phi dày ở gần đỉnh (mặt dốc đứng) — t∈[0,1]
const phAt = (t: number) => PH_MAX * (1 - (1 - t) ** 2);

function crownGeo(k: K, th0: number, th1: number, nT: number, nP: number, hole: boolean): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const v = new THREE.Vector3();
  for (let j = 0; j <= nP; j++) {
    const ph = phAt(j / nP);
    for (let i = 0; i <= nT; i++) {
      const th = th0 + ((th1 - th0) * i) / nT;
      crownPt(k, th, ph, v);
      pos.push(v.x, v.y, v.z);
      uv.push(th / (2 * Math.PI) + 0.5, ph);
    }
  }
  const row = nT + 1;
  for (let j = 0; j < nP; j++) for (let i = 0; i < nT; i++) {
    if (hole) {
      const th = th0 + ((th1 - th0) * (i + 0.5)) / nT, ph = phAt((j + 0.5) / nP);
      if (Math.abs(wrapPi(th - Math.PI)) < openA(ph)) continue;
    }
    const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---------- texture vẽ bằng canvas ----------
const cnv = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function twill(aniso: number, fine = false): THREE.CanvasTexture {
  const c = cnv(256, 256), x = c.getContext('2d')!;
  x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 256);
  const step = fine ? 4 : 6;
  x.lineWidth = fine ? 1.4 : 2.4;
  for (let i = -256; i < 512; i += step) {
    x.strokeStyle = (i / step) % 2 ? '#a6a6a6' : '#5c5c5c';
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 256, 256); x.stroke();
  }
  for (let n = 0; n < 1400; n++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},0.08)`; x.fillRect(Math.random() * 256, Math.random() * 256, 2, 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso;
  return t;
}
function meshAlpha(aniso: number): THREE.CanvasTexture {
  const c = cnv(128, 128), x = c.getContext('2d')!;
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 128);
  x.fillStyle = '#000000';
  for (let r = 0; r < 4; r++) for (let q = 0; q < 5; q++) {
    const cx = (q + (r % 2 ? 0.5 : 0)) * 32, cy = r * 32 + 16;
    for (const dx of [0, 128, -128]) { x.beginPath(); x.ellipse(cx + dx, cy, 11.5, 10, 0, 0, Math.PI * 2); x.fill(); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso;
  return t;
}
/** texture chóp (u = góc quanh trục, v = phi): màu múi, bóng đường may, chỉ diễu 2 bên */
function crownTex(k: K, front: string, back: string, aniso: number): THREE.CanvasTexture {
  const W = 2048, H = 1024;
  const c = cnv(W, H), x = c.getContext('2d')!;
  x.fillStyle = front; x.fillRect(0, 0, W, H);
  if (k.trucker) { x.fillStyle = back; x.fillRect(0, 0, W / 3, H); x.fillRect((2 * W) / 3, 0, W / 3, H); }
  const seams = [-2, -1, 0, 1, 2, 3].map((s) => s * SEAM).filter((s) => !(k.trucker && s === 0));
  for (const s of seams) {
    const u = (s / (2 * Math.PI) + 0.5) * W;
    const col = k.trucker && Math.abs(s) > 0.1 ? back : front;
    const g = x.createLinearGradient(u - 10, 0, u + 10, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(u - 10, 0, 20, H);
    x.strokeStyle = capShade(col, -0.32); x.lineWidth = 2; x.setLineDash([7, 5]);
    for (const du of [-9, 9]) { x.beginPath(); x.moveTo(u + du, 0); x.lineTo(u + du, H * 0.97); x.stroke(); }
    x.setLineDash([]);
  }
  // viền đáy (băng viền) hơi tối
  const gb = x.createLinearGradient(0, 0, 0, 26);
  gb.addColorStop(0, 'rgba(0,0,0,0.22)'); gb.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gb; x.fillRect(0, 0, W, 26);
  const t = canvasTex(c, aniso); t.wrapS = THREE.RepeatWrapping;
  return t;
}
function visorTex(k: K, col: string, aniso: number): THREE.CanvasTexture {
  const W = 1024, H = 512;
  const c = cnv(W, H), x = c.getContext('2d')!;
  x.fillStyle = col; x.fillRect(0, 0, W, H);
  const rows = k.kind === 'snap' ? [0.92, 0.84, 0.76, 0.68, 0.6, 0.52, 0.44, 0.36] : [0.9, 0.78, 0.66, 0.54, 0.42, 0.3];
  x.strokeStyle = capShade(col, -0.3); x.lineWidth = 2.2; x.setLineDash([9, 6]);
  for (const r of rows) { x.beginPath(); x.moveTo(20, (1 - r) * H); x.lineTo(W - 20, (1 - r) * H); x.stroke(); }
  x.setLineDash([]);
  const g = x.createLinearGradient(0, 0, 0, 24); g.addColorStop(0, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, 24);
  return canvasTex(c, aniso);
}
function strapTex(dad: boolean, col: string, aniso: number): THREE.CanvasTexture {
  const c = cnv(512, 64), x = c.getContext('2d')!;
  x.fillStyle = dad ? col : '#1b1b1d'; x.fillRect(0, 0, 512, 64);
  if (dad) {
    x.strokeStyle = capShade(col, -0.3); x.lineWidth = 2; x.setLineDash([8, 5]);
    for (const y of [9, 55]) { x.beginPath(); x.moveTo(0, y); x.lineTo(512, y); x.stroke(); }
  } else {
    for (let i = 0; i < 9; i++) {
      const cx = 40 + i * 54;
      const g = x.createRadialGradient(cx - 3, 28, 1, cx, 32, 11);
      g.addColorStop(0, '#4a4a4f'); g.addColorStop(1, '#0d0d0e');
      x.fillStyle = g; x.beginPath(); x.arc(cx, 32, 10, 0, Math.PI * 2); x.fill();
    }
  }
  return canvasTex(c, aniso);
}
/** bump cho hình thêu: vùng có chỉ nổi lên + vân chỉ xéo */
function embroideryBump(src: HTMLCanvasElement | ImageBitmap | HTMLImageElement, w: number, h: number, aniso: number): THREE.CanvasTexture {
  const a = cnv(w, h), x = a.getContext('2d')!;
  x.drawImage(src as CanvasImageSource, 0, 0, w, h);
  x.globalCompositeOperation = 'source-in'; x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'source-atop';
  x.strokeStyle = 'rgba(0,0,0,0.42)'; x.lineWidth = Math.max(1, w / 900);
  const step = Math.max(2.5, w / 260);
  x.save(); x.translate(w / 2, h / 2); x.rotate((40 * Math.PI) / 180);
  for (let i = -w * 1.5; i < w * 1.5; i += step) { x.beginPath(); x.moveTo(i, -h * 1.5); x.lineTo(i, h * 1.5); x.stroke(); }
  x.restore();
  const o = cnv(w, h), y = o.getContext('2d')!;
  y.fillStyle = '#000'; y.fillRect(0, 0, w, h);
  y.filter = `blur(${Math.max(0.6, w / 1400)}px)`; y.drawImage(a, 0, 0);
  const t = new THREE.CanvasTexture(o); t.anisotropy = aniso;
  return t;
}

// ---------- decal bám mặt chóp theo độ dài cung ----------
function meridianTable(k: K, th: number, from = 0) {
  const n = 500, L: number[] = [0], P: number[] = [from];
  let prev = crownPt(k, th, from);
  for (let i = 1; i <= n; i++) {
    const ph = from + ((PH_MAX - from) * i) / n;
    const p = crownPt(k, th, ph);
    L.push(L[i - 1] + p.distanceTo(prev)); P.push(ph); prev = p;
  }
  return (len: number) => {
    if (len <= 0) return from;
    for (let i = 1; i < L.length; i++) if (L[i] >= len) { const f = (len - L[i - 1]) / (L[i] - L[i - 1]); return P[i - 1] + f * (P[i] - P[i - 1]); }
    return PH_MAX;
  };
}
function latitudeTheta(k: K, thc: number, ph: number, s: number): number {
  const dir = Math.sign(s) || 1;
  let acc = 0, th = thc, prev = crownPt(k, th, ph);
  const step = 0.004 * dir;
  for (let i = 0; i < 1200; i++) {
    const p = crownPt(k, th + step, ph);
    const d = p.distanceTo(prev);
    if (acc + d >= Math.abs(s)) return th + step * ((Math.abs(s) - acc) / d);
    acc += d; th += step; prev = p;
  }
  return th;
}
function decalGeo(k: K, thc: number, y0: number, W: number, H: number, lift: number): THREE.BufferGeometry {
  const nx = 56, ny = 32;
  const mer = meridianTable(k, thc);
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= ny; j++) {
    const ph = mer(y0 + (H * j) / ny);
    for (let i = 0; i <= nx; i++) {
      const sx = -W / 2 + (W * i) / nx;
      const th = latitudeTheta(k, thc, ph, sx);
      const p = crownPt(k, th, ph).add(crownNormal(k, th, ph).multiplyScalar(lift));
      pos.push(p.x, p.y, p.z); uv.push(i / nx, j / ny);
    }
  }
  const row = nx + 1;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * row + i; idx.push(a, a + row, a + 1, a + 1, a + row, a + row + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// ---------- vành ----------
function visorPt(k: K, s: number, r: number, yo: number): THREE.Vector3 {
  const th = s * k.vth;
  const pin = new THREE.Vector3(k.b * Math.sin(th), 0, k.a * Math.cos(th));
  const n = new THREE.Vector3(Math.sin(th) / k.b, 0, Math.cos(th) / k.a).normalize();
  const dir = n.multiplyScalar(0.5).add(new THREE.Vector3(0, 0, 0.5)).normalize();
  const d = k.D * Math.pow(Math.max(0, Math.cos((s * Math.PI) / 2)), 0.62) + 3;
  // cong vành: mép càng xa (r·d) và càng lệch sang 2 bên (s²) thì càng cụp xuống
  const y = -r * d * (k.tilt + k.curv * s * s * 1.6) + yo;
  return pin.add(dir.multiplyScalar(d * r)).setY(y - (1 - r) * 0.6);
}
function visorGeo(k: K, yo: number, flip: boolean): THREE.BufferGeometry {
  const nu = 72, nr = 18;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= nr; j++) for (let i = 0; i <= nu; i++) {
    const s = -1 + (2 * i) / nu, r = j / nr;
    const p = visorPt(k, s, r, yo);
    pos.push(p.x, p.y, p.z); uv.push(i / nu, r);
  }
  const row = nu + 1;
  for (let j = 0; j < nr; j++) for (let i = 0; i < nu; i++) {
    const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
    if (flip) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/** dải mép vành (nối mặt trên – mặt dưới theo mép ngoài + 2 đầu) */
function visorEdge(k: K, t: number): THREE.BufferGeometry {
  const pts: THREE.Vector3[][] = [];
  const nu = 72;
  const edge: [number, number][] = [];
  for (let j = 0; j <= 10; j++) edge.push([-1, j / 10]);
  for (let i = 1; i <= nu; i++) edge.push([-1 + (2 * i) / nu, 1]);
  for (let j = 9; j >= 0; j--) edge.push([1, j / 10]);
  for (const [s, r] of edge) pts.push([visorPt(k, s, r, 0), visorPt(k, s, r, -t)]);
  const pos: number[] = [], idx: number[] = [];
  pts.forEach(([a, b]) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z));
  for (let i = 0; i < pts.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function tube(points: THREE.Vector3[], r: number, mat: THREE.Material, closed = false): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, closed), Math.max(16, points.length * 2), r, 8, closed), mat);
  m.castShadow = true;
  return m;
}
/** dải cong quanh trục (dây khoá, băng lót trong) */
function band(k: K, th0: number, th1: number, y0: number, y1: number, scale: number, n = 48): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const th = th0 + ((th1 - th0) * i) / n;
    for (const [j, y] of [[0, y0], [1, y1]] as const) {
      pos.push(k.b * scale * Math.sin(th), y, k.a * scale * Math.cos(th));
      uv.push(i / n, j);
    }
  }
  for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

const DECAL: Record<CapPos, { th: number; y0: number; w: number; h: number }> = {
  front: { th: 0, y0: 13, w: 100, h: 55 },
  left: { th: (84 * Math.PI) / 180, y0: 10, w: 50, h: 30 },
  right: { th: -(84 * Math.PI) / 180, y0: 10, w: 50, h: 30 },
  back: { th: Math.PI, y0: 0, w: 60, h: 25 },
};

interface Mats { tex: Map<CapPos, { map: THREE.Texture; bump?: THREE.Texture }> }

async function decalTextures(o: Cap3DOpts, aniso: number): Promise<Mats> {
  const tex = new Map<CapPos, { map: THREE.Texture; bump?: THREE.Texture }>();
  for (const p of ['front', 'left', 'right', 'back'] as CapPos[]) {
    const el = o.arts[p];
    if (!el) continue;
    const px = p === 'front' ? 1600 : 900;
    const map = await svgTex(el, o.fontCss, px, aniso, '');
    map.anisotropy = aniso;
    const img = map.image as HTMLCanvasElement;
    tex.set(p, { map, bump: o.method === 'embroider' ? embroideryBump(img, img.width, img.height, aniso) : undefined });
  }
  return { tex };
}

/** 1 chiếc mũ (đơn vị mm, đáy chóp y=0, mặt trước hướng +Z) */
function buildCap(k: K, o: Cap3DOpts, m: Mats, aniso: number): THREE.Group {
  const g = new THREE.Group();
  const frontCol = o.crown, backCol = k.trucker ? o.visor : o.crown;
  const ctex = crownTex(k, frontCol, backCol, aniso);
  const bumpC = twill(aniso); bumpC.repeat.set(40, 12);
  const fabric = new THREE.MeshStandardMaterial({ map: ctex, bumpMap: bumpC, bumpScale: 0.55, roughness: k.kind === 'snap' ? 0.86 : 0.93, side: THREE.DoubleSide });
  const nT = 96;
  // nửa trước (2 múi trước / mút trucker)
  const front = new THREE.Mesh(crownGeo(k, -SEAM, SEAM, nT, 72, false), k.trucker
    ? new THREE.MeshStandardMaterial({ map: ctex, bumpMap: twill(aniso, true), bumpScale: 0.25, roughness: 0.78, side: THREE.DoubleSide })
    : fabric);
  front.castShadow = true; front.receiveShadow = true;
  g.add(front);
  // nửa sau (4 múi, có lỗ sau) — trucker: lưới
  const backMat = k.trucker
    ? (() => { const a = meshAlpha(aniso); a.repeat.set(72, 20); return new THREE.MeshStandardMaterial({ map: ctex, alphaMap: a, alphaTest: 0.5, roughness: 0.85, side: THREE.DoubleSide }); })()
    : fabric;
  const back = new THREE.Mesh(crownGeo(k, SEAM, 2 * Math.PI - SEAM, nT * 2, 72, true), backMat);
  back.castShadow = true; back.receiveShadow = true;
  g.add(back);

  // lót trong (băng mồ hôi) + lớp lót tối cho trucker để nhìn xuyên lưới thấy chiều sâu
  const lining = new THREE.MeshStandardMaterial({ color: capShade(frontCol, -0.38), roughness: 0.95, side: THREE.DoubleSide });
  g.add(new THREE.Mesh(band(k, Math.PI + OPEN_A + 0.02, 3 * Math.PI - OPEN_A - 0.02, 0.4, 24, 0.975, 120), lining));

  // đường may nổi + băng viền
  const seamMat = new THREE.MeshStandardMaterial({ color: capShade(frontCol, -0.12), roughness: 0.9 });
  const seamMatB = new THREE.MeshStandardMaterial({ color: capShade(backCol, -0.12), roughness: 0.9 });
  const seams = [-2, -1, 0, 1, 2, 3].map((s) => s * SEAM).filter((s) => !(k.trucker && s === 0));
  for (const s of seams) {
    const isBack = Math.abs(wrapPi(s - Math.PI)) < 0.01;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) {
      const ph = (isBack ? OPEN_P : 0) + ((0.985 - (isBack ? OPEN_P : 0)) * i) / 40;
      pts.push(crownPt(k, s, ph).add(crownNormal(k, s, ph).multiplyScalar(0.35)));
    }
    g.add(tube(pts, 0.8, k.trucker && Math.abs(wrapPi(s)) > 0.1 ? seamMatB : seamMat));
  }
  // băng viền đáy (trừ lỗ sau) + viền vòm lỗ sau
  const base: THREE.Vector3[] = [];
  for (let i = 0; i <= 120; i++) {
    const th = Math.PI + OPEN_A + ((2 * Math.PI - 2 * OPEN_A) * i) / 120;
    base.push(crownPt(k, th, 0.004).add(crownNormal(k, th, 0.004).multiplyScalar(0.6)));
  }
  g.add(tube(base, 1.5, seamMat));
  const arch: THREE.Vector3[] = [];
  for (let i = 0; i <= 40; i++) {
    const psi = (Math.PI * i) / 40;
    const th = Math.PI + OPEN_A * Math.cos(psi), ph = Math.max(0.004, OPEN_P * Math.sin(psi));
    arch.push(crownPt(k, th, ph).add(crownNormal(k, th, ph).multiplyScalar(0.4)));
  }
  g.add(tube(arch, 2.1, seamMatB));

  // nút chóp
  const top = crownPt(k, 0, 1);
  const btn = new THREE.Mesh(new THREE.SphereGeometry(8.5, 28, 14), new THREE.MeshStandardMaterial({ color: backCol, map: null, roughness: 0.9, bumpMap: bumpC, bumpScale: 0.4 }));
  btn.scale.set(1, 0.34, 1); btn.position.copy(top).add(new THREE.Vector3(0, -0.4, 0)); btn.castShadow = true;
  g.add(btn);
  // khuy thoáng (không có ở trucker)
  if (!k.trucker) {
    const eyeMat = new THREE.MeshStandardMaterial({ color: capShade(frontCol, -0.28), roughness: 0.8 });
    for (let i = 0; i < 6; i++) {
      const th = SEAM / 2 + i * SEAM, ph = 0.74;
      const p = crownPt(k, th, ph), n = crownNormal(k, th, ph);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.75, 8, 20), eyeMat);
      ring.position.copy(p).add(n.clone().multiplyScalar(0.3));
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      g.add(ring);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(1.6, 16), new THREE.MeshBasicMaterial({ color: '#141414' }));
      hole.position.copy(p).add(n.clone().multiplyScalar(0.12)); hole.quaternion.copy(ring.quaternion);
      g.add(hole);
    }
  }

  // vành
  const vtex = visorTex(k, o.visor, aniso);
  const bumpV = twill(aniso); bumpV.repeat.set(16, 5);
  const vTop = new THREE.Mesh(visorGeo(k, 0, false), new THREE.MeshStandardMaterial({ map: vtex, bumpMap: bumpV, bumpScale: 0.5, roughness: 0.9, side: THREE.DoubleSide }));
  const under = k.kind === 'snap' ? '#33463a' : capShade(o.visor, -0.1);
  const vBot = new THREE.Mesh(visorGeo(k, -2.8, true), new THREE.MeshStandardMaterial({ color: under, bumpMap: bumpV, bumpScale: 0.4, roughness: 0.92, side: THREE.DoubleSide }));
  const vEdge = new THREE.Mesh(visorEdge(k, 2.8), new THREE.MeshStandardMaterial({ color: capShade(o.visor, -0.18), roughness: 0.9, side: THREE.DoubleSide }));
  for (const v of [vTop, vBot, vEdge]) { v.castShadow = true; v.receiveShadow = true; g.add(v); }

  // dây khoá sau
  const dad = k.kind === 'dad';
  const strapMat = new THREE.MeshStandardMaterial({ map: strapTex(dad, backCol, aniso), roughness: dad ? 0.92 : 0.5, side: THREE.DoubleSide });
  const strap = new THREE.Mesh(band(k, Math.PI - OPEN_A * 1.25, Math.PI + OPEN_A * 1.25, 3.5, 17, 1.012, 40), strapMat);
  strap.castShadow = true; g.add(strap);
  if (dad) {
    const bk = new THREE.Mesh(new THREE.BoxGeometry(15, 16, 2.2), new THREE.MeshStandardMaterial({ color: '#C9C4B8', metalness: 0.9, roughness: 0.28 }));
    const th = Math.PI - OPEN_A * 0.55;
    bk.position.set(k.b * 1.03 * Math.sin(th), 10.2, k.a * 1.03 * Math.cos(th));
    bk.rotation.y = th; bk.castShadow = true; g.add(bk);
  } else {
    const strap2 = new THREE.Mesh(band(k, Math.PI - OPEN_A * 0.15, Math.PI + OPEN_A * 1.05, 4.5, 16, 1.026, 24), strapMat);
    g.add(strap2);
  }

  // hình thêu / in
  const embroider = o.method === 'embroider';
  for (const [p, t] of m.tex) {
    const D = DECAL[p];
    let y0 = D.y0;
    if (p === 'back') {
      const mer = meridianTable(k, Math.PI);
      let L = 0; void mer;
      // độ dài cung tới đỉnh vòm lỗ sau
      let prev = crownPt(k, Math.PI, 0);
      for (let i = 1; i <= 200; i++) { const q = crownPt(k, Math.PI, (OPEN_P * i) / 200); L += q.distanceTo(prev); prev = q; }
      y0 = L + 5;
    }
    const mat = new THREE.MeshPhysicalMaterial({
      map: t.map, transparent: true, alphaTest: 0.3, roughness: embroider ? 0.5 : 0.62,
      bumpMap: t.bump || null, bumpScale: embroider ? 2.2 : 0, sheen: embroider ? 0.7 : 0, sheenRoughness: 0.35, sheenColor: new THREE.Color('#ffffff'),
      polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, side: THREE.DoubleSide,
    });
    const dm = new THREE.Mesh(decalGeo(k, D.th, y0, D.w, D.h, embroider ? 1.35 : 1.2), mat); // nổi trên đường may
    dm.renderOrder = 2;
    g.add(dm);
  }
  return g;
}

/** nghiêng mũ để đáy sau + mép vành cùng chạm đất (như đặt mũ trên bàn) */
function restOnTable(k: K, cap: THREE.Group): THREE.Group {
  let beta = 0;
  for (let i = 0; i <= 20; i++) {
    const s = -1 + i / 10;
    const p = visorPt(k, s, 1, -2.8);
    beta = Math.max(beta, Math.atan2(-p.y, p.z + k.a));
  }
  const tilt = new THREE.Group();
  cap.rotation.x = -beta;
  tilt.add(cap);
  return tilt;
}

export function capBuilder(o: Cap3DOpts): Builder {
  return async (aniso) => {
    const k: K = { ...KINDS[o.kind], trucker: o.kind === 'trucker', kind: o.kind };
    const m = await decalTextures(o, aniso);
    const out = new THREE.Group();
    const place = (rotY: number, x: number, z: number) => {
      const cap = restOnTable(k, buildCap(k, o, m, aniso));
      const holder = new THREE.Group();
      holder.add(cap);
      holder.rotation.y = rotY;
      holder.position.set(x, 0, z);
      holder.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(holder);
      holder.position.y -= bb.min.y;
      return holder;
    };
    const showBack = !!o.arts.back;
    const a = place(0.12, 0, 0);
    const b = place(Math.PI + (showBack ? 1.05 : 1.9), 175, -150);
    const world = new THREE.Group();
    world.add(a, b);
    world.scale.setScalar(S);
    out.add(world);
    out.traverse((n) => { if ((n as THREE.Mesh).isMesh) (n as THREE.Mesh).castShadow = true; });
    return { group: out, view: { az: 0.42, el: 0.3 }, aim: 0.4, zoom: 1.55, blob: 0.6 };
  };
}
