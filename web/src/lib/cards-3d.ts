'use client';
// Thiệp cưới / sinh nhật 3D.
// • Thiệp cưới: nằm trên khăn lanh, rút hé từ phong bì cùng tông (nắp mở phẳng, lòng nắp lót hoạ tiết),
//   túi phong bì chữ V đè lên nửa dưới thiệp, dấu sáp ấn chữ lồng tên 2 người; thêm 1 thiệp dựng trên đế gỗ.
// • Thiệp sinh nhật: 1 thiệp dựng trên đế gỗ + 1 thiệp nằm nghiêng, giấy kim tuyến (confetti) rắc quanh.
// Giấy dày thật (~0.4mm). Bảng màu có tông VÀNG (accent ánh kim) → phần màu vàng trên thiệp thành NHŨ kim loại
// thật (bản đồ metal/roughness tách từ chính ảnh thiết kế). Texture = SVG thiệp (render code).

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { S, canvasTex, type Builder } from './mockup3d';
import { selfContainedSvg, svgToCanvas } from './svg-export';

export interface Card3DPal { bg: string; panel: string; ink: string; accent: string; dark?: boolean; extra: string[] }
export interface Card3DOpts {
  el: SVGSVGElement | null; // thiệp không lề xén (đúng khổ)
  wMm: number; hMm: number;
  kind: 'wedding' | 'birthday';
  pal: Card3DPal;
  initials: string;          // chữ lồng trên dấu sáp (vd "B&H")
  fontCss: string;
}

const T = 0.42; // dày giấy (mm)

// đặt bounding box về 1 điểm → khung hình (frame) bỏ qua vật nền (khăn, confetti) mà vẫn ôm sát thiệp
function noBounds(m: THREE.Mesh) {
  const p = new THREE.Vector3();
  m.geometry.boundingBox = new THREE.Box3(p.clone(), p.clone());
  m.geometry.boundingSphere = new THREE.Sphere(p.clone(), 0);
  m.frustumCulled = false; // bounding giả → không cho three cắt bỏ khỏi khung
}

// đọc màu theo sRGB (Color của three lưu tuyến tính → phải đổi khi so với pixel ảnh)
const hex = (h: string) => { const v = h.replace('#', ''); return [0, 2, 4].map((k) => parseInt(v.slice(k, k + 2), 16)); };
function hsl(h: string) { const c = new THREE.Color(h); const o = { h: 0, s: 0, l: 0 }; c.getHSL(o, THREE.SRGBColorSpace); return o; }
// trộn 2 màu (sRGB) theo t
function mix(a: string, b: string, t: number) { const A = new THREE.Color(a), B = new THREE.Color(b); return A.lerp(B, t).getStyle(); }
// tông vàng ánh kim: hue 28–55°, độ bão hoà vừa (không phải vàng chanh/cam rực)
export function isGoldTone(h: string) { const { h: hu, s, l } = hsl(h); const d = hu * 360; return d >= 28 && d <= 56 && s >= 0.22 && s <= 0.8 && l >= 0.3 && l <= 0.78; }

// bản đồ vật liệu (R clearcoat, G nhám, B kim loại): pixel gần màu accent vàng → nhũ
function foilMap(src: HTMLCanvasElement, accent: string, aniso: number) {
  const w = src.width, h = src.height;
  const s = src.getContext('2d')!.getImageData(0, 0, w, h).data;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h); const d = img.data;
  const [ar, ag, ab] = hex(accent);
  for (let i = 0; i < d.length; i += 4) {
    const dist = Math.hypot(s[i] - ar, s[i + 1] - ag, s[i + 2] - ab);
    const k = Math.max(0, Math.min(1, (58 - dist) / 26));
    d[i] = 255; d[i + 1] = Math.round(255 * (0.72 - 0.46 * k)); d[i + 2] = Math.round(255 * k); d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.anisotropy = aniso;
  return t;
}

// vân giấy mỹ thuật nhẹ (bump) dùng chung
let paperBumpC: HTMLCanvasElement | null = null;
function paperBump(aniso: number) {
  if (!paperBumpC) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d')!; const img = x.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (Math.random() - 0.5) * 46; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    x.putImageData(img, 0, 0); paperBumpC = c;
  }
  const t = new THREE.CanvasTexture(paperBumpC); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.anisotropy = aniso;
  return t;
}

// tấm thiệp nằm: mặt +y là mặt in (đầu thiệp hướng -z → đứng trước nhìn xuống đọc xuôi)
function cardMesh(w: number, h: number, front: THREE.Material, back: THREE.Material, edge: THREE.Material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w * S, T * S, h * S), [edge, edge, front, back, edge, edge]);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// đế gỗ kẹp thiệp + thiệp dựng nghiêng ra sau `tilt` rad. Trả group có đáy ở y = 0
function standingCard(card: THREE.Mesh, w: number, h: number, tilt: number, aniso: number) {
  const g = new THREE.Group();
  const c = card.clone();
  c.rotation.x = Math.PI / 2 - tilt;
  const baseW = Math.min(w * 0.62, 90), baseD = 16, baseH = 11;
  c.position.set(0, (h / 2) * Math.cos(tilt) * S + 4 * S, -(h / 2) * Math.sin(tilt) * S);
  g.add(c);
  const wood = woodTex(aniso);
  const base = new THREE.Mesh(new RoundedBoxGeometry(baseW * S, baseH * S, baseD * S, 3, 2.2 * S),
    new THREE.MeshStandardMaterial({ map: wood, roughness: 0.55, color: '#FFFFFF' }));
  base.position.set(0, (baseH / 2) * S, 0);
  base.castShadow = true; base.receiveShadow = true;
  // rãnh kẹp
  const slot = new THREE.Mesh(new THREE.BoxGeometry((baseW - 8) * S, 0.2 * S, 1.6 * S), new THREE.MeshStandardMaterial({ color: '#3B2617', roughness: 0.9 }));
  slot.position.set(0, baseH * S + 0.05 * S, 0); g.add(slot);
  g.add(base);
  return g;
}

let woodC: HTMLCanvasElement | null = null;
function woodTex(aniso: number) {
  if (!woodC) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const x = c.getContext('2d')!;
    const gr = x.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#B07A4C'); gr.addColorStop(1, '#9A6638');
    x.fillStyle = gr; x.fillRect(0, 0, 512, 128);
    for (let i = 0; i < 70; i++) {
      x.strokeStyle = `rgba(${70 + Math.random() * 30},${40 + Math.random() * 20},20,${0.12 + Math.random() * 0.2})`;
      x.lineWidth = 0.6 + Math.random() * 1.8; x.beginPath();
      const y0 = Math.random() * 128; x.moveTo(0, y0);
      for (let px = 0; px <= 512; px += 32) x.lineTo(px, y0 + Math.sin(px / 60 + i) * 3 + (Math.random() - 0.5) * 1.5);
      x.stroke();
    }
    woodC = c;
  }
  return canvasTex(woodC, aniso);
}

// khăn lanh: vân dệt + mép mờ dần (alpha) — làm nền, không tính vào khung hình
function linenCloth(size: number, aniso: number) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d')!;
  x.fillStyle = '#E9E6E0'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 512; i += 2) {
    x.fillStyle = `rgba(110,90,60,${0.07 + Math.random() * 0.09})`; x.fillRect(0, i, 512, 1);
    x.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.07})`; x.fillRect(i, 0, 1, 512);
  }
  for (let k = 0; k < 900; k++) { x.fillStyle = `rgba(110,90,60,${Math.random() * 0.12})`; x.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 6, 1); }
  const map = canvasTex(c, aniso); map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(10, 10);
  const bump = new THREE.CanvasTexture(c); bump.wrapS = bump.wrapT = THREE.RepeatWrapping; bump.repeat.set(10, 10);
  const a = document.createElement('canvas'); a.width = a.height = 256;
  const ax = a.getContext('2d')!; const rg = ax.createRadialGradient(128, 128, 60, 128, 128, 128);
  rg.addColorStop(0, '#fff'); rg.addColorStop(0.7, '#fff'); rg.addColorStop(1, '#000');
  ax.fillStyle = rg; ax.fillRect(0, 0, 256, 256);
  const alpha = new THREE.CanvasTexture(a);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 1.2, roughness: 0.96, alphaMap: alpha, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.03 * S; m.receiveShadow = true; m.renderOrder = -1;
  noBounds(m);
  return m;
}

// lòng nắp phong bì: hoạ tiết lưới trám nhỏ theo bảng màu
function linerTex(pal: Card3DPal, aniso: number) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d')!;
  x.fillStyle = pal.accent; x.fillRect(0, 0, 512, 512);
  x.strokeStyle = pal.dark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.35)'; x.lineWidth = 2;
  for (let i = -512; i < 1024; i += 36) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 512, 512); x.stroke(); x.beginPath(); x.moveTo(i + 512, 0); x.lineTo(i, 512); x.stroke(); }
  x.fillStyle = pal.dark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.5)';
  for (let yy = 0; yy < 512; yy += 36) for (let xx = 0; xx < 512; xx += 36) { x.beginPath(); x.arc(xx, yy, 3, 0, Math.PI * 2); x.fill(); }
  const t = canvasTex(c, aniso); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2);
  return t;
}

// dấu sáp: mép gợn không đều, mặt trên ấn chữ lồng + vòng chỉ
function waxSeal(r: number, color: string, initials: string, metal: boolean, aniso: number) {
  const g = new THREE.Group();
  const sh = new THREE.Shape();
  const N = 64;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const rr = r * (1 + 0.06 * Math.sin(a * 7 + 0.6) + 0.04 * Math.sin(a * 13 + 2) + 0.03 * Math.sin(a * 3));
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
    if (i === 0) sh.moveTo(px, py); else sh.lineTo(px, py);
  }
  const body = new THREE.ExtrudeGeometry(sh, { depth: 1.6, bevelEnabled: true, bevelThickness: 0.9, bevelSize: 1.1, bevelSegments: 5, curveSegments: 8 });
  body.scale(S, S, S);
  const mat = new THREE.MeshPhysicalMaterial(metal
    ? { color, metalness: 0.9, roughness: 0.32 }
    : { color, roughness: 0.38, clearcoat: 0.55, clearcoatRoughness: 0.35, sheen: 0.2 });
  const m = new THREE.Mesh(body, mat); m.rotation.x = -Math.PI / 2; m.castShadow = true; g.add(m);
  // mặt ấn: bump từ chữ lồng
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 256);
  x.strokeStyle = '#303030'; x.lineWidth = 7; x.beginPath(); x.arc(128, 128, 96, 0, Math.PI * 2); x.stroke();
  x.lineWidth = 3; x.beginPath(); x.arc(128, 128, 84, 0, Math.PI * 2); x.stroke();
  x.fillStyle = '#2A2A2A'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `italic 700 ${initials.length > 3 ? 64 : 84}px "Playfair Display", Georgia, serif`;
  x.fillText(initials, 128, 134);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; x.beginPath(); x.arc(128 + Math.cos(a) * 90, 128 + Math.sin(a) * 90, 3, 0, Math.PI * 2); x.fill(); }
  const bump = new THREE.CanvasTexture(c); bump.anisotropy = aniso;
  const top = new THREE.Mesh(new THREE.CircleGeometry(r * 0.86 * S, 48), new THREE.MeshPhysicalMaterial({ ...(metal ? { color, metalness: 0.9, roughness: 0.3 } : { color, roughness: 0.4, clearcoat: 0.5 }), bumpMap: bump, bumpScale: 3 }));
  top.rotation.x = -Math.PI / 2; top.position.y = (1.6 + 0.9 + 0.02) * S; g.add(top);
  return g;
}

// confetti rắc quanh: gộp 1 lưới (vertex color) cho nhẹ
function confetti(cols: string[], spreadX: number, spreadZ: number, avoid: { x: number; z: number; w: number; d: number }[]) {
  const geos: THREE.BufferGeometry[] = [];
  let n = 0, tries = 0;
  while (n < 140 && tries < 2000) {
    tries++;
    const px = (Math.random() - 0.5) * spreadX, pz = (Math.random() - 0.5) * spreadZ;
    if (avoid.some((a) => Math.abs(px - a.x) < a.w / 2 && Math.abs(pz - a.z) < a.d / 2)) continue;
    const round = Math.random() < 0.4;
    const gg = round ? new THREE.CircleGeometry(1.6 + Math.random() * 1.2, 12) : new THREE.PlaneGeometry(1.8 + Math.random(), 4 + Math.random() * 3);
    gg.rotateX(-Math.PI / 2 + (Math.random() - 0.5) * 0.5);
    gg.rotateY(Math.random() * Math.PI * 2);
    gg.translate(px, 0.35 + Math.random() * 0.25, pz);
    const c = new THREE.Color(cols[n % cols.length]);
    const arr = new Float32Array(gg.attributes.position.count * 3);
    for (let i = 0; i < gg.attributes.position.count; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    gg.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    gg.deleteAttribute('uv'); gg.deleteAttribute('normal'); gg.computeVertexNormals();
    geos.push(gg); n++;
  }
  const merged = mergeGeometries(geos)!; merged.scale(S, S, S);
  const m = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.15, side: THREE.DoubleSide }));
  m.castShadow = true; m.receiveShadow = true; noBounds(m);
  return m;
}

export function cardsBuilder(o: Card3DOpts): Builder {
  return async (aniso) => {
    if (!o.el) throw new Error('Chưa dựng xong thiệp');
    const { wMm: w, hMm: h, pal } = o;
    const outW = 1500, outH = Math.round((outW * h) / w);
    const cv = await svgToCanvas(await selfContainedSvg(o.el, o.fontCss), outW, outH, pal.bg);
    const map = canvasTex(cv, aniso);
    const gold = isGoldTone(pal.accent);
    const bump = paperBump(aniso);
    const front = gold
      ? new THREE.MeshPhysicalMaterial({ map, metalness: 0.7, roughness: 1, metalnessMap: foilMap(cv, pal.accent, aniso), roughnessMap: undefined, bumpMap: bump, bumpScale: 0.25, envMapIntensity: 1.9 })
      : new THREE.MeshPhysicalMaterial({ map, roughness: 0.7, bumpMap: bump, bumpScale: 0.25 });
    if (gold) { const fm = (front as THREE.MeshPhysicalMaterial).metalnessMap!; (front as THREE.MeshPhysicalMaterial).roughnessMap = fm; }
    const backCol = pal.dark ? pal.bg : '#FBF8F2';
    const back = new THREE.MeshStandardMaterial({ color: backCol, roughness: 0.85, bumpMap: bump, bumpScale: 0.25 });
    const edge = new THREE.MeshStandardMaterial({ color: pal.dark ? pal.panel : '#F3EFE7', roughness: 0.9 });
    const card = cardMesh(w, h, front, back, edge);
    const g = new THREE.Group();

    if (o.kind === 'wedding') {
      // phong bì nằm (mặt lưng lên), miệng hướng -z; thiệp rút hé ra phía miệng
      const ew = w + 9, eh = h + 9;
      // phong bì cùng tông nhưng đậm hơn nền thiệp để tách khối (sáng: pha màu accent; tối: panel)
      const envCol = pal.dark ? mix(pal.bg, '#000000', 0.15) : mix(pal.accent, '#FFFFFF', 0.3);
      const paper = new THREE.MeshStandardMaterial({ color: envCol, roughness: 0.82, bumpMap: bump, bumpScale: 0.3 });
      const env = new THREE.Group();
      env.rotation.y = -0.1; env.position.set(-w * 0.18 * S, 0, h * 0.1 * S);
      const base = new THREE.Mesh(new THREE.BoxGeometry(ew * S, 0.35 * S, eh * S), paper);
      base.position.y = 0.175 * S; base.castShadow = true; base.receiveShadow = true; env.add(base);
      // nắp mở phẳng (tam giác bo đầu), lòng nắp lót hoạ tiết
      const fh = eh * 0.5;
      const flapSh = new THREE.Shape();
      flapSh.moveTo(-ew / 2, 0); flapSh.lineTo(ew / 2, 0); flapSh.lineTo(8, fh - 3); flapSh.quadraticCurveTo(0, fh + 1, -8, fh - 3); flapSh.lineTo(-ew / 2, 0);
      const flapGeo = new THREE.ShapeGeometry(flapSh, 12);
      // UV theo mm cho lót
      const pos = flapGeo.attributes.position; const uv = flapGeo.attributes.uv;
      for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + ew / 2) / ew, pos.getY(i) / fh);
      flapGeo.scale(S, S, S);
      const liner = gold
        ? new THREE.MeshPhysicalMaterial({ map: linerTex(pal, aniso), metalness: 0.85, roughness: 0.38 })
        : new THREE.MeshStandardMaterial({ map: linerTex(pal, aniso), roughness: 0.75 });
      const flap = new THREE.Mesh(flapGeo, liner);
      flap.rotation.x = -Math.PI / 2; flap.position.set(0, 0.36 * S, -(eh / 2) * S);
      flap.receiveShadow = true; env.add(flap);
      // thiệp rút hé ~42% ra khỏi miệng
      const c = card.clone();
      c.position.set(w * 0.06 * S, (0.35 + T / 2 + 0.05) * S, -(h * 0.3) * S);
      c.rotation.y = 0.16;
      env.add(c);
      // túi phong bì chữ V đè lên nửa dưới thiệp
      const pk = new THREE.Shape();
      const top = -eh / 2 + 5;
      pk.moveTo(-ew / 2, eh / 2); pk.lineTo(ew / 2, eh / 2); pk.lineTo(ew / 2, top); pk.lineTo(0, -eh * 0.02); pk.lineTo(-ew / 2, top); pk.lineTo(-ew / 2, eh / 2);
      const pkGeo = new THREE.ExtrudeGeometry(pk, { depth: 0.35, bevelEnabled: false });
      pkGeo.scale(S, S, S);
      const pocket = new THREE.Mesh(pkGeo, paper);
      pocket.rotation.x = Math.PI / 2; // shape y → +z, đùn xuống −y
      pocket.position.y = (0.35 + T + 0.12 + 0.35) * S;
      pocket.castShadow = true; pocket.receiveShadow = true; env.add(pocket);
      // đường gấp mép túi (nếp tối nhẹ)
      const crease = new THREE.MeshBasicMaterial({ color: new THREE.Color(envCol).multiplyScalar(0.8) });
      const lineGeo = (ax: number, az: number, bx: number, bz: number) => {
        const len = Math.hypot(bx - ax, bz - az);
        const l = new THREE.Mesh(new THREE.PlaneGeometry(len * S, 0.35 * S), crease);
        l.rotation.x = -Math.PI / 2; l.rotation.z = -Math.atan2(bz - az, bx - ax);
        l.position.set(((ax + bx) / 2) * S, pocket.position.y + 0.02 * S, ((az + bz) / 2) * S);
        return l;
      };
      env.add(lineGeo(-ew / 2, top, 0, -eh * 0.02), lineGeo(ew / 2, top, 0, -eh * 0.02));
      // dấu sáp trên mũi V
      const sealCol = gold ? (pal.dark ? '#C9A45C' : '#8E1F2B') : new THREE.Color(pal.accent).multiplyScalar(0.72).getStyle();
      const seal = waxSeal(12, sealCol, o.initials, gold && !!pal.dark, aniso);
      seal.position.set(0, pocket.position.y, (-eh * 0.02 + 7) * S);
      env.add(seal);
      g.add(env);
      // thiệp thứ 2 dựng trên đế gỗ, phía sau-phải
      const st = standingCard(card, w, h, 0.2, aniso);
      st.position.set((w * 0.62) * S, 0, -(h * 0.55) * S); st.rotation.y = -0.32;
      g.add(st);
      g.add(linenCloth(Math.max(w, h) * 5 * S, aniso));
      return { group: g, view: { az: 0.12, el: 0.62 }, aim: 0.25, zoom: 1.32, blob: 0 };
    }

    // sinh nhật: thiệp dựng + thiệp nằm nghiêng + confetti
    const st = standingCard(card, w, h, 0.17, aniso);
    st.position.set(-(w * 0.28) * S, 0, -(h * 0.12) * S); st.rotation.y = 0.12;
    g.add(st);
    const lay = card.clone();
    lay.position.set((w * 0.55) * S, (T / 2) * S, (h * 0.32) * S); lay.rotation.y = -0.38;
    g.add(lay);
    const cols = pal.extra.length ? pal.extra : [pal.accent];
    g.add(confetti(cols, w * 3.2, h * 2.2, [
      { x: w * 0.55, z: h * 0.32, w: w * 1.15, d: h * 1.05 },
      { x: -w * 0.28, z: -h * 0.12, w: Math.min(w * 0.62, 90) + 6, d: 22 },
    ]));
    return { group: g, view: { az: 0.22, el: 0.3 }, aim: 0.42, zoom: 1.22, blob: 0 };
  };
}
