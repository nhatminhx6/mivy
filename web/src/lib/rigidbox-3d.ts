'use client';
// Hộp quà cứng 3D: bìa 2mm có độ dày thật, giấy bồi bọc mép + phần gấp vào trong (turn-in) thấy ở miệng hộp,
// khay lót nhung + sản phẩm mẫu, ép kim = metalnessMap/roughnessMap lấy từ khuôn ép (mask) → ánh kim thật khi xoay.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';
import type { RBKind, RBProduct } from './rigidbox-engine';

export interface RB3DOpts {
  kind: RBKind; W: number; D: number; H: number; T: number; lidH: number;
  base: { w: number; d: number; h: number }; tray: { w: number; d: number; h: number };
  paper: string; trayColor: string; foilColor: string | null; ribbonColor: string; shimmer: boolean;
  product: RBProduct; ribbon: boolean; fontCss: string;
  faces: Record<string, { color: SVGSVGElement | null; mask: SVGSVGElement | null }>;
}

const TI = 15;

function grainTex(aniso: number): THREE.Texture {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d')!;
  const im = x.createImageData(256, 256);
  for (let i = 0; i < im.data.length; i += 4) { const v = 118 + Math.random() * 20; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  x.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso;
  return t;
}

/** canvas mặt trong: màu lót + dải giấy bồi gấp vào (turn-in) theo các cạnh chỉ định */
function innerTex(w: number, h: number, liner: string, paper: string, bands: { t?: boolean; b?: boolean; l?: boolean; r?: boolean }, aniso: number): THREE.Texture {
  const k = Math.min(4, 1024 / Math.max(w, h));
  const c = document.createElement('canvas'); c.width = Math.max(8, Math.round(w * k)); c.height = Math.max(8, Math.round(h * k));
  const x = c.getContext('2d')!;
  x.fillStyle = liner; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = paper;
  const b = Math.min(TI, h * 0.45) * k, bw = Math.min(TI, w * 0.45) * k;
  if (bands.t) x.fillRect(0, 0, c.width, b);
  if (bands.b) x.fillRect(0, c.height - b, c.width, b);
  if (bands.l) x.fillRect(0, 0, bw, c.height);
  if (bands.r) x.fillRect(c.width - bw, 0, bw, c.height);
  // mép giấy hơi tối (đường cắt giấy dán đè lên lót)
  x.strokeStyle = 'rgba(0,0,0,0.18)'; x.lineWidth = Math.max(1, k * 0.4);
  if (bands.t) { x.beginPath(); x.moveTo(0, b); x.lineTo(c.width, b); x.stroke(); }
  if (bands.b) { x.beginPath(); x.moveTo(0, c.height - b); x.lineTo(c.width, c.height - b); x.stroke(); }
  if (bands.l) { x.beginPath(); x.moveTo(bw, 0); x.lineTo(bw, c.height); x.stroke(); }
  if (bands.r) { x.beginPath(); x.moveTo(c.width - bw, 0); x.lineTo(c.width - bw, c.height); x.stroke(); }
  return canvasTex(c, aniso);
}

const lighten = (hex: string, k: number) => {
  const c = new THREE.Color(hex); c.lerp(new THREE.Color('#FFFFFF'), k); return c;
};

export function rigidBoxBuilder(o: RB3DOpts): Builder {
  return async (aniso) => {
    const grain = grainTex(aniso);
    const paperProps = (): THREE.MeshPhysicalMaterialParameters => (o.shimmer
      ? { roughness: 0.42, metalness: 0.28, clearcoat: 0.25, clearcoatRoughness: 0.4 }
      : { roughness: 0.66, metalness: 0, clearcoat: 0.08, clearcoatRoughness: 0.6 });
    const paper = new THREE.MeshPhysicalMaterial({ color: o.paper, bumpMap: grain, bumpScale: 0.35, ...paperProps() });
    const liner = new THREE.MeshPhysicalMaterial({ color: o.trayColor, roughness: 0.9, sheen: 1, sheenColor: lighten(o.trayColor, 0.35), sheenRoughness: 0.45 });
    const velvet = new THREE.MeshPhysicalMaterial({ color: o.trayColor, roughness: 0.95, sheen: 1, sheenColor: lighten(o.trayColor, 0.45), sheenRoughness: 0.35 });

    // vật liệu mặt in (có ép kim → metalnessMap + roughnessMap từ mask)
    const cache = new Map<string, Promise<THREE.Material>>();
    const face = (key: string, fallback: THREE.Material = paper): Promise<THREE.Material> => {
      if (!cache.has(key)) {
        cache.set(key, (async () => {
          const f = o.faces[key];
          if (!f?.color) return fallback;
          const vb = f.color.viewBox.baseVal;
          const px = Math.max(384, Math.min(2048, Math.round(Math.max(vb.width, vb.height) * 6)));
          const map = await svgTex(f.color, o.fontCss, px, aniso, '');
          const params: THREE.MeshPhysicalMaterialParameters = { map, bumpMap: grain, bumpScale: 0.3, ...paperProps() };
          if (f.mask && o.foilColor) {
            const mt = await svgTex(f.mask, o.fontCss, px, aniso, '#000000');
            mt.colorSpace = THREE.NoColorSpace;
            const src = mt.image as HTMLCanvasElement;
            const rc = document.createElement('canvas'); rc.width = src.width; rc.height = src.height;
            const rx = rc.getContext('2d')!; rx.drawImage(src, 0, 0);
            const id = rx.getImageData(0, 0, rc.width, rc.height);
            for (let i = 0; i < id.data.length; i += 4) { const v = 255 - id.data[i] * 0.72; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; }
            rx.putImageData(id, 0, 0);
            const rt = new THREE.CanvasTexture(rc); rt.anisotropy = aniso;
            Object.assign(params, { metalness: 1, metalnessMap: mt, roughness: o.shimmer ? 0.6 : 0.7, roughnessMap: rt, clearcoat: 0.1 });
          }
          return new THREE.MeshPhysicalMaterial(params);
        })());
      }
      return cache.get(key)!;
    };
    const inner = (w: number, h: number, bands: { t?: boolean; b?: boolean; l?: boolean; r?: boolean }) =>
      new THREE.MeshPhysicalMaterial({ map: innerTex(w, h, o.trayColor, o.paper, bands, aniso), roughness: 0.85, sheen: 0.6, sheenColor: lighten(o.trayColor, 0.3), sheenRoughness: 0.5 });

    const box = (w: number, h: number, d: number, mats: THREE.Material[], x = 0, y = 0, z = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
      m.position.set(x, y, z); m.castShadow = true;
      return m;
    };
    // thứ tự vật liệu Box: +x, -x, +y, -y, +z, -z

    /** hộp hở miệng trên (đáy hộp / khay / ngăn kéo): thành cao full h, sàn nằm giữa 4 thành */
    const openTop = async (w: number, d: number, h: number, t: number, outer: { front: THREE.Material; back: THREE.Material; left: THREE.Material; right: THREE.Material }) => {
      const g = new THREE.Group();
      const e = paper;
      g.add(box(w, h, t, [e, e, e, e, outer.front, inner(w, h, { t: true })], 0, h / 2, d / 2 - t / 2));
      g.add(box(w, h, t, [e, e, e, e, inner(w, h, { t: true }), outer.back], 0, h / 2, -d / 2 + t / 2));
      g.add(box(t, h, d - 2 * t, [inner(d, h, { t: true }), outer.left, e, e, e, e], -w / 2 + t / 2, h / 2, 0));
      g.add(box(t, h, d - 2 * t, [outer.right, inner(d, h, { t: true }), e, e, e, e], w / 2 - t / 2, h / 2, 0));
      const fl = box(w - 2 * t, t, d - 2 * t, [e, e, liner, e, e, e], 0, t / 2, 0); fl.receiveShadow = true;
      g.add(fl);
      return g;
    };

    /** khay lót nhung + sản phẩm mẫu đặt trong lòng hộp (toạ độ lòng hộp: sàn y = t) */
    const contents = (iw: number, id: number, ih: number, floorY: number, ribbonFront: boolean) => {
      const g = new THREE.Group();
      const insH = ih * 0.42;
      const ins = new THREE.Mesh(new RoundedBoxGeometry(iw - 0.6, insH, id - 0.6, 3, Math.min(3, insH * 0.3)), velvet);
      ins.position.y = floorY + insH / 2; ins.receiveShadow = true; ins.castShadow = false;
      g.add(ins);
      const top = floorY + insH;
      const gold = new THREE.MeshStandardMaterial({ color: '#D6B160', metalness: 1, roughness: 0.25 });
      const darkTray = new THREE.Color(o.trayColor).getHSL({ h: 0, s: 0, l: 0 }).l < 0.35;
      const lacquer = new THREE.MeshPhysicalMaterial({ color: darkTray ? '#EFE3C8' : '#8E1B20', roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12 });
      const add = (m: THREE.Mesh) => { m.castShadow = true; g.add(m); return m; };
      const pr = o.product;
      if (pr === 'tet' || pr === 'tea') {
        if (pr === 'tet') {
          const ht = ih * 0.7, r = Math.min(id * 0.17, iw * 0.12, ht / 2.3);
          [-0.3, -0.07].forEach((fx) => {
            const b = add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, ht, 48), lacquer)); b.position.set(fx * iw, top - ht * 0.32 + ht / 2, -id * 0.02);
            const cap = add(new THREE.Mesh(new THREE.CylinderGeometry(r * 1.03, r * 1.03, ht * 0.13, 48), gold)); cap.position.set(fx * iw, top - ht * 0.32 + ht - ht * 0.065 + 0.4, -id * 0.02);
            const band = add(new THREE.Mesh(new THREE.CylinderGeometry(r * 1.005, r * 1.005, ht * 0.05, 48), gold)); band.position.set(fx * iw, top - ht * 0.32 + ht * 0.55, -id * 0.02);
          });
          const bw = iw * 0.26, bd = id * 0.62, bh = Math.min(ih * 0.75, 60);
          const bx = add(new THREE.Mesh(new RoundedBoxGeometry(bw, bh, bd, 3, 1.2), new THREE.MeshPhysicalMaterial({ color: '#D9B868', metalness: 0.6, roughness: 0.35, clearcoat: 0.5 })));
          bx.position.set(iw * 0.3, top - bh * 0.3 + bh / 2, 0);
        } else {
          // bánh trung thu 2×2
          const r = Math.min(iw, id) * 0.21, ht = Math.min(ih * 0.6, r * 0.85);
          const cv = document.createElement('canvas'); cv.width = cv.height = 256;
          const cx = cv.getContext('2d')!;
          const gr = cx.createRadialGradient(128, 128, 20, 128, 128, 128); gr.addColorStop(0, '#D99A4A'); gr.addColorStop(1, '#A8662A');
          cx.fillStyle = gr; cx.fillRect(0, 0, 256, 256);
          cx.strokeStyle = 'rgba(70,35,10,0.55)'; cx.lineWidth = 5;
          for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; cx.beginPath(); cx.arc(128 + Math.cos(a) * 96, 128 + Math.sin(a) * 96, 18, 0, Math.PI * 2); cx.stroke(); }
          cx.beginPath(); cx.arc(128, 128, 62, 0, Math.PI * 2); cx.stroke();
          cx.fillStyle = 'rgba(70,35,10,0.5)'; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; cx.beginPath(); cx.ellipse(128 + Math.cos(a) * 30, 128 + Math.sin(a) * 30, 22, 9, a, 0, Math.PI * 2); cx.fill(); } cx.beginPath(); cx.arc(128, 128, 12, 0, Math.PI * 2); cx.fill();
          const topTex = canvasTex(cv, aniso);
          const cake = [new THREE.MeshStandardMaterial({ color: '#B87533', roughness: 0.6 }), new THREE.MeshStandardMaterial({ map: topTex, bumpMap: topTex, bumpScale: 1.2, roughness: 0.55 }), new THREE.MeshStandardMaterial({ color: '#B87533' })];
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
            const m = add(new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.98, ht, 48), cake));
            m.position.set(sx * iw * 0.23, top - ht * 0.25 + ht / 2, sz * id * 0.23);
          });
        }
      } else if (pr === 'wine') {
        const len = Math.min(iw * 0.86, 310), r = Math.min(id * 0.32, ih * 0.36, 38);
        const pts: THREE.Vector2[] = [];
        const P = (rr: number, yy: number) => pts.push(new THREE.Vector2(rr, yy));
        P(0.01, 0); P(r * 0.92, 0); P(r, len * 0.02); P(r, len * 0.6); P(r * 0.92, len * 0.66); P(r * 0.55, len * 0.72); P(r * 0.36, len * 0.78); P(r * 0.34, len * 0.96); P(r * 0.38, len * 0.97); P(r * 0.36, len); P(0.01, len);
        const glass = new THREE.MeshPhysicalMaterial({ color: '#173623', roughness: 0.06, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.03 });
        const bottle = add(new THREE.Mesh(new THREE.LatheGeometry(pts, 48), glass));
        bottle.rotation.z = -Math.PI / 2; bottle.position.set(-len / 2, top + r * 0.55, 0);
        const cap = add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.37, r * 0.37, len * 0.2, 32), new THREE.MeshStandardMaterial({ color: '#7A1420', metalness: 0.75, roughness: 0.3 })));
        cap.rotation.z = -Math.PI / 2; cap.position.set(-len / 2 + len * 0.89, top + r * 0.55, 0);
        const label = add(new THREE.Mesh(new THREE.CylinderGeometry(r + 0.3, r + 0.3, len * 0.26, 48, 1, true, -Math.PI * 0.15, Math.PI * 1.3), new THREE.MeshStandardMaterial({ color: '#F1E6CC', roughness: 0.8, side: THREE.DoubleSide })));
        label.rotation.z = -Math.PI / 2; label.rotation.x = Math.PI; label.position.set(-len / 2 + len * 0.3, top + r * 0.55, 0);
      } else if (pr === 'cosmetic') {
        const jr = Math.min(id * 0.22, ih * 0.6), jh = Math.min(ih * 0.55, jr * 1.1);
        const jar = add(new THREE.Mesh(new THREE.CylinderGeometry(jr, jr, jh, 48), new THREE.MeshPhysicalMaterial({ color: '#F4EFE7', roughness: 0.2, clearcoat: 1 })));
        jar.position.set(-iw * 0.2, top - jh * 0.35 + jh / 2, 0);
        const lid = add(new THREE.Mesh(new THREE.CylinderGeometry(jr * 1.02, jr * 1.02, jh * 0.32, 48), gold)); lid.position.set(-iw * 0.2, top - jh * 0.35 + jh + jh * 0.16, 0);
        const br = Math.min(id * 0.12, ih * 0.35), bl = Math.min(iw * 0.34, 90);
        const amber = new THREE.MeshPhysicalMaterial({ color: '#7A3E12', roughness: 0.08, clearcoat: 1, metalness: 0.1 });
        const b = add(new THREE.Mesh(new THREE.CylinderGeometry(br, br, bl, 40), amber)); b.rotation.z = Math.PI / 2; b.position.set(iw * 0.16, top + br * 0.5, 0);
        const dc = add(new THREE.Mesh(new THREE.CylinderGeometry(br * 0.6, br * 0.6, bl * 0.28, 32), gold)); dc.rotation.z = Math.PI / 2; dc.position.set(iw * 0.16 + bl / 2 + bl * 0.13, top + br * 0.5, 0);
        const bulb = add(new THREE.Mesh(new THREE.SphereGeometry(br * 0.62, 24, 16), new THREE.MeshStandardMaterial({ color: '#1E1E1E', roughness: 0.6 }))); bulb.position.set(iw * 0.16 + bl / 2 + bl * 0.3, top + br * 0.5, 0);
      } else {
        // trang sức: gối nhung + nhẫn + đá
        const cw = iw * 0.52, ch = Math.min(ih * 0.4, 14), cd = id * 0.42;
        const cushion = add(new THREE.Mesh(new RoundedBoxGeometry(cw, ch, cd, 4, Math.min(ch * 0.45, 6)), velvet)); cushion.position.set(0, top + ch / 2 - 1, 0);
        const avail = floorY + ih - (top + ch);
        const rr = Math.max(4, Math.min(10, cd * 0.3)); void avail;
        const ring = add(new THREE.Mesh(new THREE.TorusGeometry(rr, Math.max(1, rr * 0.16), 20, 64), gold)); ring.position.set(0, top + ch + rr * 0.3, 0);
        const gr = Math.max(1.8, rr * 0.34);
        const gem = add(new THREE.Mesh(new THREE.OctahedronGeometry(gr), new THREE.MeshPhysicalMaterial({ color: '#CFE2FF', roughness: 0, metalness: 0.2, transmission: 0.5, ior: 2.4, thickness: 3, iridescence: 0.8, clearcoat: 1 })));
        gem.position.set(0, top + ch + rr * 1.3 + gr * 0.6, 0);
      }
      if (ribbonFront) {
        const rib = ribbonStrip([new THREE.Vector3(0, top - 1, id / 2 - 6), new THREE.Vector3(0, top + 6, id / 2 - 1), new THREE.Vector3(0, top + 11, id / 2 - 6), new THREE.Vector3(0, top + 4, id / 2 - 12)], Math.min(12, iw * 0.08), new THREE.Vector3(1, 0, 0), satin());
        g.add(rib);
      }
      return g;
    };
    const satin = () => new THREE.MeshPhysicalMaterial({ color: o.ribbonColor, roughness: 0.3, sheen: 1, sheenColor: lighten(o.ribbonColor, 0.5), sheenRoughness: 0.25, clearcoat: 0.35, side: THREE.DoubleSide });

    const out = new THREE.Group();
    const T = o.T;
    let view = { az: 0.3, el: 0.6 }, aim = 0.35, zoom = 1.08;

    if (o.kind === 'lid') {
      const b = o.base;
      const baseG = await openTop(b.w, b.d, b.h, T, {
        front: await face('baseFront'), back: await face('baseBack'), left: await face('baseEnd'), right: await face('baseEnd'),
      });
      baseG.add(contents(b.w - 2 * T, b.d - 2 * T, b.h - T, T, o.ribbon));
      // nắp: tấm mặt trùm full W×D, 4 thành bên dưới
      const lid = new THREE.Group();
      const L = o.lidH, e = paper;
      const top = await face('top'), fr = await face('front'), rr = await face('rear'), en = await face('end');
      lid.add(box(o.W, T, o.D, [e, e, top, inner(o.W, o.D, { t: true, b: true, l: true, r: true }), e, e], 0, L - T / 2, 0));
      const wh = L - T;
      lid.add(box(o.W, wh, T, [e, e, e, e, fr, inner(o.W, wh, { b: true })], 0, wh / 2, o.D / 2 - T / 2));
      lid.add(box(o.W, wh, T, [e, e, e, e, inner(o.W, wh, { b: true }), rr], 0, wh / 2, -o.D / 2 + T / 2));
      lid.add(box(T, wh, o.D - 2 * T, [inner(o.D, wh, { b: true }), en, e, e, e, e], -o.W / 2 + T / 2, wh / 2, 0));
      lid.add(box(T, wh, o.D - 2 * T, [en, inner(o.D, wh, { b: true }), e, e, e, e], o.W / 2 - T / 2, wh / 2, 0));
      // đặt: đáy mở phía sau-trái, nắp nằm cạnh phía trước-phải (không chồng nhau)
      baseG.position.set(-o.W * 0.32, 0, -o.D * 0.28);
      lid.rotation.y = -0.2;
      lid.position.set(o.W * 0.34, 0, o.D * 0.42);
      out.add(baseG, lid);
      separate(baseG, lid, new THREE.Vector3(1, 0, 0.55));
      view = { az: 0.22, el: 0.62 }; aim = 0.3; zoom = 1.45;
    } else if (o.kind === 'magnet') {
      const mk = async (open: number) => {
        const g = new THREE.Group();
        const e = paper, W = o.W, D = o.D, H = o.H;
        const top = await face('top'), fr = await face('front'), bk = await face('back'), en = await face('end');
        g.add(box(W, T, D, [e, e, liner, e, e, e], 0, T / 2, 0));
        g.add(box(W, H - T, T, [e, e, e, e, liner, bk], 0, T + (H - T) / 2, -D / 2 + T / 2));
        const tr = o.tray;
        const tray = await openTop(tr.w, tr.d, tr.h, T, { front: paper, back: paper, left: en, right: en });
        tray.position.set(0, T, -D / 2 + T + tr.d / 2);
        if (open > 0) tray.add(contents(tr.w - 2 * T, tr.d - 2 * T, tr.h - T, T, o.ribbon));
        g.add(tray);
        const lidP = new THREE.Group(); lidP.position.set(0, H, -D / 2);
        lidP.add(box(W, T, D, [e, e, top, inner(W, D, { t: true, b: true, l: true, r: true }), e, e], 0, -T / 2, D / 2));
        const flapP = new THREE.Group(); flapP.position.set(0, 0, D);
        flapP.add(box(W, H, T, [e, e, e, e, fr, inner(W, H, { t: true, b: true, l: true, r: true })], 0, -H / 2, T / 2));
        lidP.add(flapP);
        g.add(lidP);
        if (open > 0) { lidP.rotation.x = -open; flapP.rotation.x = open + 0.45; }
        return g;
      };
      const closed = await mk(0), opened = await mk(1.72);
      opened.position.set(-o.W * 0.55, 0, -o.D * 0.45);
      closed.position.set(o.W * 0.3, 0, o.D * 0.42);
      closed.rotation.y = -0.16;
      out.add(opened, closed);
      separate(opened, closed, new THREE.Vector3(1, 0, 0.6));
      view = { az: 0.26, el: 0.48 }; aim = 0.36; zoom = 1.4;
    } else {
      const W = o.W, D = o.D, H = o.H, e = paper;
      const top = await face('top'), fr = await face('front'), bk = await face('back'), df = await face('drawerFront');
      const sleeve = new THREE.Group();
      sleeve.add(box(W, H, T, [e, e, e, e, fr, inner(W, H, { l: true, r: true })], 0, H / 2, D / 2 - T / 2));
      sleeve.add(box(W, H, T, [e, e, e, e, inner(W, H, { l: true, r: true }), bk], 0, H / 2, -D / 2 + T / 2));
      sleeve.add(box(W, T, D - 2 * T, [e, e, top, inner(W, D, { l: true, r: true }), e, e], 0, H - T / 2, 0));
      sleeve.add(box(W, T, D - 2 * T, [e, e, inner(W, D, { l: true, r: true }), paper, e, e], 0, T / 2, 0));
      const tr = o.tray;
      const trayMat = new THREE.MeshPhysicalMaterial({ color: o.trayColor, roughness: 0.6, bumpMap: grain, bumpScale: 0.3 });
      const drawer = await openTop(tr.w, tr.d, tr.h, T, { front: trayMat, back: trayMat, left: trayMat, right: df });
      drawer.add(contents(tr.w - 2 * T, tr.d - 2 * T, tr.h - T, T, false));
      const pull = W * 0.46;
      drawer.position.set(pull, T + 0.4, 0);
      if (o.ribbon) {
        const x0 = tr.w / 2, y0 = tr.h * 0.5, rw = Math.min(12, tr.d * 0.12);
        drawer.add(ribbonStrip([new THREE.Vector3(x0 - 0.2, y0 + 3, 0), new THREE.Vector3(x0 + 8, y0 + 4, 0), new THREE.Vector3(x0 + 13, y0 - 2, 0), new THREE.Vector3(x0 + 7, y0 - 7, 0), new THREE.Vector3(x0 - 0.2, y0 - 4, 0)], rw, new THREE.Vector3(0, 0, 1), satin()));
      }
      out.add(sleeve, drawer);
      out.position.x = -pull / 2;
      view = { az: 0.62, el: 0.56 }; aim = 0.4; zoom = 1.35;
    }

    out.traverse((n) => { if ((n as THREE.Mesh).isMesh) (n as THREE.Mesh).castShadow = true; });
    const root = new THREE.Group();
    root.add(out);
    root.scale.setScalar(S);
    // canh giữa theo x/z
    const bb = new THREE.Box3().setFromObject(root);
    const c = bb.getCenter(new THREE.Vector3());
    root.position.x -= c.x; root.position.z -= c.z; root.position.y -= bb.min.y;
    const wrap = new THREE.Group(); wrap.add(root);
    return { group: wrap, view, aim, zoom, blob: 0.5 };
  };
}

/** dời b theo hướng dir tới khi không chồng a (tính trên mặt sàn) */
function separate(a: THREE.Object3D, b: THREE.Object3D, dir: THREE.Vector3) {
  const d = dir.clone().normalize();
  for (let i = 0; i < 80; i++) {
    a.updateMatrixWorld(true); b.updateMatrixWorld(true);
    const A = new THREE.Box3().setFromObject(a), B = new THREE.Box3().setFromObject(b);
    const ov = A.min.x < B.max.x && A.max.x > B.min.x && A.min.z < B.max.z && A.max.z > B.min.z;
    if (!ov) { b.position.addScaledVector(d, 10); return; }
    b.position.addScaledVector(d, 8);
  }
}

/** dải ruy băng phẳng chạy theo đường cong (bề rộng theo `side`) */
function ribbonStrip(pts: THREE.Vector3[], width: number, side: THREE.Vector3, mat: THREE.Material): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(pts);
  const N = 40, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const s = side.clone().normalize().multiplyScalar(width / 2);
  for (let i = 0; i <= N; i++) {
    const p = curve.getPoint(i / N);
    pos.push(p.x - s.x, p.y - s.y, p.z - s.z, p.x + s.x, p.y + s.y, p.z + s.z);
    uv.push(0, i / N, 1, i / N);
    if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = true;
  return m;
}
