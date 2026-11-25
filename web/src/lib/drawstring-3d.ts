'use client';
// Túi rút 3D: thân vải phồng (như đang đựng đồ), miệng túi RÚT LẠI — vải dồn thành nếp tỏa ra quanh ống luồn dây;
// 2 dây dù chạy từ 2 góc miệng xuống 2 góc đáy, xỏ qua khoen kim loại trên miếng gia cố, thắt nút.
// Chất liệu: vải dù (bóng nhẹ, vân ô ripstop), canvas (sợi dệt), vải không dệt (vân chấm ép nhiệt).
// Cảnh: 1 túi đứng (mặt trước), 1 túi nằm phẳng phía trước (mặt sau nếu có in sau, không thì mặt trước).

import * as THREE from 'three';
import { S, canvasTex, type Builder } from './mockup3d';
import { selfContainedSvg, svgToCanvas } from './svg-export';
import { DS_CHANNEL, DS_PRINT_TOP, type DSFabric, type DSMaterial, type DSMethod, type DSSize } from './drawstring-engine';

export interface Drawstring3DOpts {
  front: SVGSVGElement | null; back: SVGSVGElement | null; size: DSSize;
  fabric: DSFabric; material: DSMaterial; method: DSMethod; fontCss: string;
}

let seed = 7;
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const smooth = (a: number, b: number, t: number) => { const k = Math.max(0, Math.min(1, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
const hexMul = (hex: string, k: number) => {
  const s = hex.replace('#', ''); const v = [0, 2, 4].map((i) => Math.min(255, Math.round(parseInt(s.slice(i, i + 2), 16) * k)));
  return `rgb(${v.join(',')})`;
};
const isDarkHex = (hex: string) => { const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); return 0.299 * r + 0.587 * g + 0.114 * b < 110; };

// ---------- vân vải (xám quanh 128 → overlay màu + bump) ----------
function fabricTile(mat: DSMaterial): HTMLCanvasElement {
  const px = 128;
  const c = document.createElement('canvas'); c.width = c.height = px;
  const x = c.getContext('2d')!;
  x.fillStyle = 'rgb(128,128,128)'; x.fillRect(0, 0, px, px);
  seed = 13;
  if (mat === 'canvas') {
    const t = 4, n = px / t;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const over = (i + j) % 2 === 0, b = 0.85 + rnd() * 0.25;
      const g = over ? x.createLinearGradient(0, j * t, 0, (j + 1) * t) : x.createLinearGradient(i * t, 0, (i + 1) * t, 0);
      const v = (k: number) => { const q = Math.max(0, Math.min(255, Math.round(128 * b * k))); return `rgb(${q},${q},${q})`; };
      g.addColorStop(0, v(0.62)); g.addColorStop(0.5, v(1.12)); g.addColorStop(1, v(0.62));
      x.fillStyle = g; x.fillRect(i * t, j * t, t, t);
    }
  } else if (mat === 'du') {
    // vải dù: sợi rất mịn + ô ripstop (sợi dày mỗi ~5mm)
    for (let i = 0; i < px; i += 2) { x.fillStyle = `rgba(255,255,255,${0.04 + rnd() * 0.04})`; x.fillRect(0, i, px, 1); }
    x.strokeStyle = 'rgba(255,255,255,0.22)'; x.lineWidth = 1.4;
    for (let i = 0; i <= px; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, px); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(px, i); x.stroke(); }
    x.strokeStyle = 'rgba(0,0,0,0.12)'; x.lineWidth = 0.8;
    for (let i = 1.4; i <= px; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, px); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(px, i); x.stroke(); }
  } else {
    // vải không dệt: sợi rối + lưới chấm ép nhiệt hình thoi
    for (let k = 0; k < 900; k++) {
      x.strokeStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '0,0,0'},${0.05 + rnd() * 0.08})`; x.lineWidth = 0.6;
      const sx = rnd() * px, sy = rnd() * px, a = rnd() * Math.PI, l = 4 + rnd() * 12;
      x.beginPath(); x.moveTo(sx, sy); x.quadraticCurveTo(sx + Math.cos(a) * l * 0.5 + rnd() * 3, sy + Math.sin(a) * l * 0.5, sx + Math.cos(a) * l, sy + Math.sin(a) * l); x.stroke();
    }
    x.fillStyle = 'rgba(0,0,0,0.22)';
    for (let j = 0; j < px; j += 8) for (let i = (j / 8) % 2 ? 4 : 0; i < px; i += 8) { x.beginPath(); x.moveTo(i, j - 1.6); x.lineTo(i + 1.6, j); x.lineTo(i, j + 1.6); x.lineTo(i - 1.6, j); x.fill(); }
  }
  return c;
}

async function designCanvas(el: SVGSVGElement, fontCss: string, outW: number): Promise<HTMLCanvasElement> {
  const vb = el.viewBox.baseVal;
  return svgToCanvas(await selfContainedSvg(el, fontCss), outW, Math.round((outW * vb.height) / vb.width));
}

interface PanelTex { map: THREE.Texture; rough: THREE.Texture }
/** mặt túi: màu vải + vân + ống luồn dây (nếp + chỉ may) + hình in ăn vào vải */
async function panelTex(o: Drawstring3DOpts, el: SVGSVGElement | null, aniso: number): Promise<PanelTex> {
  const { wMm, hMm, pw } = o.size;
  const TW = 1600, f = TW / wMm, TH = Math.round(hMm * f);
  const c = document.createElement('canvas'); c.width = TW; c.height = TH;
  const x = c.getContext('2d')!;
  const fab = o.fabric, dark = isDarkHex(fab.color);
  x.fillStyle = fab.color; x.fillRect(0, 0, TW, TH);
  seed = 3;
  for (let i = 0; i < 22; i++) {
    const r = 90 + rnd() * 260, cx = rnd() * TW, cy = rnd() * TH;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, rnd() > 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.045)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  const tile = fabricTile(o.material);
  const weave = (alpha: number) => {
    x.save(); x.globalCompositeOperation = 'overlay'; x.globalAlpha = alpha;
    const pat = x.createPattern(tile, 'repeat')!;
    // 1 ô vân = 20mm (dù) / 12mm (canvas) / 16mm (không dệt)
    const mm = o.material === 'du' ? 20 : o.material === 'canvas' ? 12 : 16;
    pat.setTransform(new DOMMatrix().scale((mm * f) / 128));
    x.fillStyle = pat; x.fillRect(0, 0, TW, TH); x.restore();
  };
  weave(o.material === 'du' ? 0.45 : dark ? 0.32 : 0.55);
  // ống luồn dây: bóng nếp gấp dưới ống + chỉ may
  const chY = DS_CHANNEL * f;
  const sh = x.createLinearGradient(0, chY - 3 * f, 0, chY + 4 * f);
  sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.45, 'rgba(0,0,0,0.2)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = sh; x.fillRect(0, chY - 3 * f, TW, 7 * f);
  const hl = x.createLinearGradient(0, 0, 0, chY);
  hl.addColorStop(0, 'rgba(255,255,255,0.07)'); hl.addColorStop(0.5, 'rgba(255,255,255,0.0)'); hl.addColorStop(1, 'rgba(0,0,0,0.06)');
  x.fillStyle = hl; x.fillRect(0, 0, TW, chY);
  x.save(); x.strokeStyle = dark ? hexMul(fab.thread, 1.5) : hexMul(fab.thread, 0.7); x.lineWidth = 0.55 * f;
  x.setLineDash([3 * f, 1.6 * f]); x.beginPath(); x.moveTo(0, chY - 4 * f); x.lineTo(TW, chY - 4 * f); x.stroke(); x.restore();
  // hình in
  let ink: HTMLCanvasElement | null = null;
  if (el) {
    ink = await designCanvas(el, o.fontCss, Math.round(pw * f));
    x.drawImage(ink, ((wMm - pw) / 2) * f, DS_PRINT_TOP * f);
    weave(o.method === 'screen' ? 0.18 : 0.08);
  }
  const map = canvasTex(c, aniso);
  // độ nhám: vải dù bóng hơn, mực lụa hơi bóng
  const R = 512, rf = R / wMm;
  const rc = document.createElement('canvas'); rc.width = R; rc.height = Math.round(hMm * rf);
  const rx = rc.getContext('2d')!;
  const base = o.material === 'du' ? 150 : o.material === 'canvas' ? 242 : 225;
  rx.fillStyle = `rgb(${base},${base},${base})`; rx.fillRect(0, 0, rc.width, rc.height);
  if (ink) {
    const tmp = document.createElement('canvas'); tmp.width = Math.round(pw * rf); tmp.height = Math.round((ink.height / ink.width) * tmp.width);
    const tx = tmp.getContext('2d')!; tx.drawImage(ink, 0, 0, tmp.width, tmp.height);
    tx.globalCompositeOperation = 'source-in'; const v = o.material === 'du' ? 120 : 175; tx.fillStyle = `rgb(${v},${v},${v})`; tx.fillRect(0, 0, tmp.width, tmp.height);
    rx.drawImage(tmp, ((wMm - pw) / 2) * rf, DS_PRINT_TOP * rf);
  }
  const rough = new THREE.CanvasTexture(rc); rough.anisotropy = aniso;
  return { map, rough };
}

/** dây dù bện: sọc chéo xoắn theo chiều dài */
function cordTex(color: string, aniso: number): THREE.Texture {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const x = c.getContext('2d')!;
  x.fillStyle = color; x.fillRect(0, 0, 64, 64);
  for (let i = -64; i < 128; i += 8) {
    x.strokeStyle = 'rgba(0,0,0,0.28)'; x.lineWidth = 2.2; x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 32, 64); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,0.16)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(i + 3, 0); x.lineTo(i + 35, 64); x.stroke();
  }
  const t = canvasTex(c, aniso); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

interface BagOpts { tex: PanelTex; backTex: PanelTex; puff: number; lying: boolean }

export function drawstringBuilder(o: Drawstring3DOpts): Builder {
  return async (aniso) => {
    if (!o.front) throw new Error('Chưa dựng xong thiết kế');
    const { wMm, hMm } = o.size;
    const fab = o.fabric, dark = isDarkHex(fab.color);
    const [ft, bt] = await Promise.all([panelTex(o, o.front, aniso), o.back ? panelTex(o, o.back, aniso) : panelTex(o, null, aniso)]);

    const tile = fabricTile(o.material);
    const mkBump = () => {
      const t = new THREE.CanvasTexture(tile); t.wrapS = t.wrapT = THREE.RepeatWrapping;
      const mm = o.material === 'du' ? 20 : o.material === 'canvas' ? 12 : 16;
      t.repeat.set(wMm / mm, hMm / mm); t.anisotropy = aniso; return t;
    };
    const du = o.material === 'du';
    const sheenColor = new THREE.Color(dark ? hexMul(fab.color, 2.4) : '#FFFFFF');
    const outer = (p: PanelTex) => new THREE.MeshPhysicalMaterial({
      map: p.map, roughnessMap: p.rough, roughness: 1, metalness: 0, bumpMap: mkBump(), bumpScale: du ? 0.5 : 1.1,
      sheen: du ? 0.6 : 0.3, sheenRoughness: du ? 0.45 : 0.8, sheenColor, clearcoat: du ? 0.12 : 0, clearcoatRoughness: 0.5, side: THREE.FrontSide,
    });
    const innerMat = new THREE.MeshStandardMaterial({ color: hexMul(fab.color, 0.72), roughness: 0.95, side: THREE.BackSide });
    const seamMat = new THREE.MeshStandardMaterial({ color: hexMul(fab.color, 0.93), roughness: du ? 0.6 : 0.95 });
    const cordColor = dark ? hexMul(fab.color, 0.9) : (fab.id === 'trang' || fab.id === 'moc' ? '#EDEBE4' : hexMul(fab.color, 0.9));
    const cordMat = new THREE.MeshStandardMaterial({ map: cordTex(cordColor, aniso), roughness: 0.7 });
    const metal = new THREE.MeshStandardMaterial({ color: '#C9CDD3', metalness: 1, roughness: 0.25 });
    const patchMat = new THREE.MeshStandardMaterial({ color: dark ? '#141414' : '#2A2A2A', roughness: 0.55 });

    /** 1 túi (đứng). puff = độ phồng (mm) */
    const makeBag = ({ tex, backTex, puff, lying }: BagOpts) => {
      const gatherW = (v: number) => 1 - 0.56 * smooth(0.68, 1, v);
      const surf = (u: number, v: number, back: boolean): [number, number, number] => {
        const sinU = Math.sin(Math.PI * u);
        const x = (u - 0.5) * wMm * gatherW(v);
        let y = v * hMm;
        // phồng: đáy là đường may (khép), giữa căng, gần miệng bị rút → xẹp dần
        const bv = Math.pow(Math.sin(Math.PI * Math.min(1, v * 1.7) / 2), 0.55) * (1 - 0.82 * smooth(0.7, 1, v));
        let z = 0.8 + puff * Math.pow(sinU, 0.62) * bv;
        // nếp rút: vải dồn thành nếp tỏa xuống từ miệng
        const gz = smooth(0.66, 1, v);
        const nf = 13;
        z += gz * (2.2 + puff * 0.1) * Math.sin(u * Math.PI * nf + (back ? 1.3 : 0)) * Math.pow(sinU, 0.3);
        y -= gz * 4 * Math.abs(Math.sin(u * Math.PI * nf * 0.5));
        // sóng vải mềm + vết kéo chéo từ góc đáy (dây kéo)
        z += 1.4 * Math.sin((u * 3.1 + v * 2.3) * Math.PI) * Math.sin(v * Math.PI) * sinU;
        z += 1.0 * Math.sin((u * 1.7 - v * 3.1) * Math.PI * 2 + 0.7) * sinU * Math.sin(v * Math.PI);
        const pull = Math.exp(-(((u - 0.12) ** 2 + (v - 0.12) ** 2) / 0.012)) + Math.exp(-(((u - 0.88) ** 2 + (v - 0.12) ** 2) / 0.012));
        z -= 2.5 * pull * (puff / 30);
        if (lying) y += 0;
        return [x, y, back ? -z : z];
      };
      const NX = 64, NY = 72;
      const bag = new THREE.Group();
      const panel = (back: boolean, t: PanelTex) => {
        const geo = new THREE.PlaneGeometry(1, 1, NX, NY);
        const p = geo.attributes.position as THREE.BufferAttribute;
        const uvA = geo.attributes.uv as THREE.BufferAttribute;
        for (let i = 0; i < p.count; i++) {
          let u = uvA.getX(i); const v = uvA.getY(i);
          if (back) u = 1 - u;
          const [px, py, pz] = surf(u, v, back);
          p.setXYZ(i, px * S, py * S, pz * S);
        }
        geo.computeVertexNormals();
        const m1 = new THREE.Mesh(geo, outer(t)); m1.castShadow = true; m1.receiveShadow = true;
        const m2 = new THREE.Mesh(geo, innerMat);
        bag.add(m1, m2);
      };
      panel(false, tex); panel(true, backTex);
      const line = (fn: (t: number) => [number, number], back: boolean, n = 48) => Array.from({ length: n + 1 }, (_, i) => { const [u, v] = fn(i / n); const [px, py, pz] = surf(u, v, back); return new THREE.Vector3(px * S, py * S, pz * S); });
      const tube = (pts: THREE.Vector3[], r: number, mat: THREE.Material = seamMat) => {
        const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, r * S, 8, false), mat);
        m.castShadow = true; bag.add(m); return m;
      };
      // đường may 2 hông + đáy, miệng ống luồn (dày hơn vì gấp vải + dây bên trong)
      tube(line((t) => [0, t], false), 1.7); tube(line((t) => [1, t], false), 1.7); tube(line((t) => [t, 0], false), 1.8);
      tube(line((t) => [t, 1], false), 3.4); tube(line((t) => [t, 1], true), 3.4);

      // ----- dây rút: 2 bên, mỗi bên 2 sợi (luồn ống trước + sau) từ góc miệng → góc đáy -----
      const top0 = surf(0, 1, false), top1 = surf(1, 1, false);
      const b0 = surf(0.03, 0.05, false), b1 = surf(0.97, 0.05, false);
      const sideCord = (sx: number, tp: [number, number, number], bp: [number, number, number]) => {
        const out = lying ? 26 : 12;
        for (const dz of [-1, 1]) {
          const pts = [
            new THREE.Vector3(tp[0], tp[1] + 3, dz * 4),
            new THREE.Vector3(tp[0] + sx * 12, tp[1] + 2, dz * 6),
            new THREE.Vector3(tp[0] + sx * (wMm * 0.18 + out * 0.5), hMm * 0.8, dz * 8),
            new THREE.Vector3(sx * (wMm / 2 + out), hMm * 0.5, dz * 8),
            new THREE.Vector3(sx * (wMm / 2 + out * 0.5), hMm * 0.2, dz * 6),
            new THREE.Vector3(bp[0] + sx * 3, bp[1] + 8, bp[2] + dz * 2 + 3),
            new THREE.Vector3(bp[0], bp[1], bp[2] + 3.5),
          ].map((v) => v.multiplyScalar(S));
          tube(pts, 3.0, cordMat);
        }
        // miếng gia cố tam giác + khoen + nút thắt
        const tri = new THREE.Shape(); const t = 34;
        tri.moveTo(0, 0); tri.lineTo(-sx * t, 0); tri.lineTo(0, t); tri.closePath();
        const pm = new THREE.Mesh(new THREE.ShapeGeometry(tri), patchMat);
        pm.position.set((sx > 0 ? wMm / 2 - 1 : -wMm / 2 + 1) * S, 1.5 * S, (bp[2] + 0.6) * S); pm.scale.setScalar(S);
        pm.castShadow = true; bag.add(pm);
        const gr = new THREE.Mesh(new THREE.TorusGeometry(4.2 * S, 1.3 * S, 12, 32), metal);
        gr.position.set(bp[0] * S, bp[1] * S, (bp[2] + 1.4) * S); gr.castShadow = true; bag.add(gr);
        const knot = new THREE.Mesh(new THREE.SphereGeometry(5 * S, 16, 12), cordMat);
        knot.scale.set(1, 0.8, 0.9);
        knot.position.set((bp[0] - sx * 2) * S, (bp[1] - 6) * S, (bp[2] + 4) * S); knot.castShadow = true; bag.add(knot);
        // 2 đuôi dây thừa sau nút
        for (const k of [0, 1]) tube([new THREE.Vector3(bp[0] - sx * 2, bp[1] - 8, bp[2] + 4), new THREE.Vector3(bp[0] - sx * (4 + k * 6), bp[1] - 16, bp[2] + 6 + k * 3), new THREE.Vector3(bp[0] - sx * (6 + k * 12), Math.max(2.5, bp[1] - 26), bp[2] + 9 + k * 5)].map((v) => v.multiplyScalar(S)), 2.2, cordMat);
      };
      sideCord(-1, top0, b0); sideCord(1, top1, b1);
      return bag;
    };

    const g = new THREE.Group();
    // túi đứng: mặt trước
    const stand = makeBag({ tex: ft, backTex: bt, puff: 50, lying: false });
    g.add(stand);
    // túi nằm phẳng phía trước: in sau thì khoe mặt sau, không thì khoe mặt trước
    const showBack = !!o.back;
    const flat = makeBag({ tex: showBack ? bt : ft, backTex: showBack ? ft : bt, puff: 13, lying: true });
    const holder = new THREE.Group(); holder.add(flat);
    flat.rotation.x = -Math.PI / 2; // nằm ngửa: mặt trước hướng lên
    flat.position.y = 10 * S;
    // túi nằm: thân trải về phía sau (−z) từ gốc → đặt gốc trước túi đứng đủ xa để không chạm nhau
    holder.rotation.y = -0.38;
    holder.position.set(wMm * 0.42 * S, 0, (hMm + 70) * S);
    g.add(holder);

    // canh giữa, đáy chạm đất
    const bb = new THREE.Box3().setFromObject(g);
    const c = bb.getCenter(new THREE.Vector3());
    const wrap = new THREE.Group(); wrap.add(g);
    g.position.set(-c.x, -bb.min.y, -c.z);
    return { group: wrap, view: { az: 0.5, el: 0.24 }, aim: 0.44, zoom: 1.45, blob: 0.6 };
  };
}
