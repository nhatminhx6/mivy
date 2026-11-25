'use client';
// Khăn lạnh 3D: gói "gối" phồng nhẹ (2 mặt khép ở 2 nếp gấp dọc), 2 đầu hàn RĂNG CƯA phẳng (vân sọc dập + mép zig-zag),
// lưng có dải hàn (fin seal) gấp nằm. Giấy bạc = kim loại bóng / giấy trắng = mờ. Bày trên mặt bàn gỗ quán ăn:
// 1 gói mặt trước, 1 gói lật mặt sau, 1 gói đã xé đầu lộ khăn trắng gấp, + chén sứ & đôi đũa.

import * as THREE from 'three';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';

export interface WW3DOpts {
  front: SVGSVGElement | null; back: SVGSVGElement | null; fontCss: string;
  L: number; W: number; E: number; paper: 'silver' | 'white'; accent: string;
  /** màu nền in (chỉ khi in đủ màu) → dải hàn lưng cùng màu nền */
  bgHex?: string | null;
}

let seed = 5;
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------- texture phụ ----------
/** vân dập: sọc răng cưa ở 2 đầu hàn + hạt giấy mịn (bump) — canvas trải theo UV gói */
function crimpBump(L: number, W: number, E: number, tornAt?: number): HTMLCanvasElement {
  const pxmm = 6, w = Math.round(L * pxmm), h = Math.round(W * pxmm);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d')!;
  x.fillStyle = '#808080'; x.fillRect(0, 0, w, h);
  // hạt giấy
  const id = x.getImageData(0, 0, w, h); const d = id.data;
  for (let i = 0; i < d.length; i += 4) { const v = 128 + (rnd() - 0.5) * 16; d[i] = d[i + 1] = d[i + 2] = v; }
  x.putImageData(id, 0, 0);
  // sọc dập răng cưa (ngang theo W, lặp mỗi 1mm) ở 2 đầu
  const band = (x0: number, x1: number) => {
    for (let mm = x0; mm < x1; mm += 1) {
      const g = x.createLinearGradient(mm * pxmm, 0, (mm + 1) * pxmm, 0);
      g.addColorStop(0, '#5a5a5a'); g.addColorStop(0.5, '#c8c8c8'); g.addColorStop(1, '#5a5a5a');
      x.fillStyle = g; x.fillRect(mm * pxmm, 0, pxmm, h);
    }
  };
  band(0, E);
  if (tornAt === undefined) band(L - E, L);
  return c;
}
/** mép răng cưa 2 đầu (alpha) — hoặc mép xé lởm chởm ở đầu phải gói đã xé */
function edgeAlpha(L: number, W: number, tornAt?: number): HTMLCanvasElement {
  const torn = tornAt !== undefined;
  const pxmm = 4, w = Math.round(L * pxmm), h = Math.round(W * pxmm);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d')!;
  x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#fff';
  x.beginPath();
  const tooth = 2.2, depth = 1.3; // răng 2.2mm, sâu 1.3mm
  const n = Math.round(W / tooth);
  // mép trái zig-zag
  x.moveTo(depth * pxmm, 0);
  for (let i = 0; i <= n * 2; i++) x.lineTo(((i % 2) ? 0.05 : depth) * pxmm, ((i * W) / (n * 2)) * pxmm);
  // mép phải
  if (torn) {
    const xe = (tornAt as number) * pxmm;
    for (let i = n * 3; i >= 0; i--) x.lineTo(xe - (0.2 + rnd() * 1.8) * pxmm, ((i * W) / (n * 3)) * pxmm);
  } else {
    for (let i = n * 2; i >= 0; i--) x.lineTo(w - ((i % 2) ? 0.05 : depth) * pxmm, ((i * W) / (n * 2)) * pxmm);
  }
  x.closePath(); x.fill();
  return c;
}
function woodCanvas(base: [number, number, number], len = 1024): HTMLCanvasElement {
  // mặt bàn gỗ ghép ván: mỗi ván 1 tông, thớ dài lượn nhẹ, mắt gỗ thưa — tương phản thấp cho đỡ "sọc"
  const c = document.createElement('canvas'); c.width = len; c.height = len;
  const x = c.getContext('2d')!;
  const [r, g, b] = base;
  const planks = 4, ph = len / planks;
  for (let i = 0; i < planks; i++) {
    const k = 0.9 + rnd() * 0.2;
    x.fillStyle = `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`; x.fillRect(0, i * ph, len, ph);
    // thớ gỗ trong ván
    for (let j = 0; j < 70; j++) {
      const y0 = i * ph + rnd() * ph, amp = 3 + rnd() * 10, fr = 0.002 + rnd() * 0.005, p0 = rnd() * 6;
      x.strokeStyle = rnd() > 0.5 ? `rgba(40,20,8,${0.05 + rnd() * 0.08})` : `rgba(255,220,180,${0.03 + rnd() * 0.05})`;
      x.lineWidth = 1 + rnd() * 3;
      x.beginPath();
      for (let px = 0; px <= len; px += 16) { const yy = Math.min(i * ph + ph - 2, Math.max(i * ph + 2, y0 + Math.sin(px * fr + p0) * amp)); if (px) x.lineTo(px, yy); else x.moveTo(px, yy); }
      x.stroke();
    }
    // mắt gỗ
    if (rnd() > 0.4) {
      const cx = rnd() * len, cy = i * ph + ph * (0.3 + rnd() * 0.4);
      for (let q = 5; q > 0; q--) { x.strokeStyle = `rgba(45,22,8,${0.06 + q * 0.025})`; x.lineWidth = 1.5; x.beginPath(); x.ellipse(cx, cy, q * 12, q * 4, 0, 0, Math.PI * 2); x.stroke(); }
    }
    // khe ghép ván
    x.fillStyle = 'rgba(25,12,5,0.55)'; x.fillRect(0, i * ph, len, 2.5);
    x.fillStyle = 'rgba(255,230,200,0.08)'; x.fillRect(0, i * ph + 2.5, len, 1.5);
  }
  return c;
}
function radialAlpha(n = 512): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(n / 2, n / 2, n * 0.36, n / 2, n / 2, n * 0.5);
  g.addColorStop(0, '#fff'); g.addColorStop(1, '#000');
  x.fillStyle = g; x.fillRect(0, 0, n, n);
  return c;
}
function fabricBump(): HTMLCanvasElement {
  const n = 256, c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d')!;
  x.fillStyle = '#7a7a7a'; x.fillRect(0, 0, n, n);
  // khăn không dệt dập chấm lưới
  x.fillStyle = '#b8b8b8';
  for (let j = 0; j < 32; j++) for (let i = 0; i < 32; i++) { if ((i + j) % 2) continue; x.beginPath(); x.arc(i * 8 + 4, j * 8 + 4, 2.2, 0, Math.PI * 2); x.fill(); }
  return c;
}

// ---------- 1 gói khăn ----------
interface SachetMats { top: THREE.Material; bot: THREE.Material; fin: THREE.Material; innerTop: THREE.Material; innerBot: THREE.Material }
/** gói khăn: dài L (trục X), rộng W (trục Z, v=0 phía xa), đáy chạm y=0. torn = đầu phải đã xé (miệng hé + khăn lộ ra) */
function sachet(L: number, W: number, E: number, mats: SachetMats, torn = false, wipeMat?: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const Lc = torn ? L - E * 0.7 : L; // phần còn lại sau khi xé
  const nu = 140, nv = 40;
  const Hmax = Math.min(W * 0.1, 7.5), Hb = Hmax * 0.5;
  const R = Math.min(16, L * 0.1);
  const eps = 0.12;
  const topPos: number[] = [], botPos: number[] = [], uvTop: number[] = [], uvBot: number[] = [];
  for (let j = 0; j <= nv; j++) {
    const v = (j / nv) * W, vn = v / W;
    const across = Math.pow(Math.sin(Math.PI * vn), 0.5);
    for (let i = 0; i <= nu; i++) {
      const u = (i / nu) * Lc;
      const dl = u - E, dr = L - E - u;
      let env = smooth(0, R, dl);
      if (!torn) env *= smooth(0, R, dr);
      // nếp nhăn hình quạt ở chỗ thắt vào mép hàn
      const pinch = env > 0 && env < 1 ? (1 - env) * env * 4 : 0;
      const wr = pinch * Math.sin(vn * Math.PI * 9 + (u < L / 2 ? 0 : 1.7)) * 0.55;
      let h = Hmax * across * env + wr * across;
      let hb = Math.min(Hmax * 0.8 * across * env, Hb);
      // miệng gói đã xé: mặt trên vểnh lên, mặt dưới hơi tụt
      if (torn) { const t = smooth(Lc - 30, Lc, u); h += t * 2.6 * across; hb += t * 0.5 * across; }
      const yT = h + eps, yB = -hb - eps;
      const x = u - L / 2, z = v - W / 2;
      topPos.push(x, yT, z); botPos.push(x, yB, z);
      uvTop.push(u / L, 1 - vn);
      uvBot.push(u / L, vn);
    }
  }
  const idx: number[] = [], idxB: number[] = [];
  const row = nu + 1;
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
    idx.push(a, c, b, b, c, d);
    idxB.push(a, b, c, b, d, c);
  }
  const mk = (pos: number[], uv: number[], ind: number[]) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos.map((p) => p * S), 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(ind); geo.computeVertexNormals();
    return geo;
  };
  const gT = mk(topPos, uvTop, idx), gB = mk(botPos, uvBot, idxB);
  const top = new THREE.Mesh(gT, mats.top), bot = new THREE.Mesh(gB, mats.bot);
  top.castShadow = bot.castShadow = true; top.receiveShadow = bot.receiveShadow = true;
  g.add(top, bot);
  if (torn) {
    // mặt trong (thấy được qua miệng gói)
    g.add(new THREE.Mesh(gT, mats.innerTop), new THREE.Mesh(gB, mats.innerBot));
    // khăn trắng gấp (không dệt, dập chấm) thò ra khỏi miệng gói, phần ngoài rủ xuống mặt bàn
    const inside = 26, out = 30, len = inside + out, wid = W * 0.62, th = 3;
    const geo = new THREE.BoxGeometry(len * S, th * S, wid * S, 32, 2, 16);
    const p = geo.attributes.position;
    const baseY = -Hb * 0.35; // tâm khăn so với mặt phẳng giữa gói
    for (let k = 0; k < p.count; k++) {
      const px = p.getX(k) / S + len / 2, py = p.getY(k) / S, pz = p.getZ(k) / S; // px: 0 (sâu trong gói) → len (ngoài)
      const zn = pz / (wid / 2);
      const o = Math.max(0, px - inside) / out; // 0..1 phần thò ra
      const inBag = 1 - smooth(inside - 6, inside, px);
      const lift = (Hmax * 0.55) * Math.pow(Math.max(0, 1 - zn * zn), 0.5) * (1 - o); // phồng theo lòng gói
      const droop = -o * o * (Hb * 0.9);   // rủ nhẹ xuống bàn
      const crumple = (Math.sin(px * 0.7 + pz * 0.35) * 0.45 + Math.sin(pz * 1.1 + px * 0.2) * 0.3) * (0.3 + o);
      const edgeCurl = Math.pow(Math.abs(zn), 3) * 1.2 * o;
      const y = baseY + (py > 0 ? lift * 0.6 : -lift * 0.15) * (inBag * 0.5 + 0.5) + droop + crumple + edgeCurl + py * (1 - 0.25 * o);
      p.setXYZ(k, (px - len / 2) * S, y * S, pz * (1 + o * 0.06) * S);
    }
    geo.computeVertexNormals();
    const wipe = new THREE.Mesh(geo, wipeMat);
    wipe.position.set((Lc - L / 2 - len / 2 + out) * S, 0, 0);
    wipe.rotation.y = 0.05; wipe.castShadow = true; wipe.receiveShadow = true;
    g.add(wipe);
  }
  // dải hàn lưng (fin seal) gấp nằm dưới đáy, giữa bề rộng
  const fin = new THREE.Mesh(new THREE.BoxGeometry((Lc - (torn ? E : E * 2) - 2) * S, 0.18 * S, 8 * S), mats.fin);
  fin.position.set(((torn ? E : E) + (Lc - (torn ? E : E * 2)) / 2 - L / 2 + (torn ? 0 : 0)) * S, (-Hb - eps - 0.1) * S, 3 * S);
  g.add(fin);
  // đáy chạm đất
  const lift = new THREE.Group(); lift.add(g); g.position.y = (Hb + eps + 0.2) * S;
  return lift;
}

function lathe(pts: [number, number][], seg = 96) { return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r * S, y * S)), seg); }

function bowl(accent: string): THREE.Group {
  const g = new THREE.Group();
  const R = 56, H = 46;
  const outer: [number, number][] = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20; outer.push([24 + (R - 24) * Math.pow(t, 0.7), 5 + (H - 5) * t]); }
  const prof: [number, number][] = [[0, 8], [24, 8.5], ...outer.map(([r, y]) => [r - 3, Math.max(8.5, y)] as [number, number]).slice(2), [R - 1.2, H + 0.7], [R + 0.3, H], ...outer.slice().reverse(), [24, 0], [21, 0], [21, 3.5], [0, 3.5]];
  const ceramic = new THREE.MeshPhysicalMaterial({ color: '#FAF8F3', roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide });
  const m = new THREE.Mesh(lathe(prof), ceramic); m.castShadow = true; m.receiveShadow = true; g.add(m);
  const band = new THREE.MeshPhysicalMaterial({ color: accent, roughness: 0.22, clearcoat: 1 });
  for (const [r, y, t] of [[R - 1.3, H - 4.5, 0.8], [R - 3, H - 9, 0.45]] as const) {
    const tor = new THREE.Mesh(new THREE.TorusGeometry(r * S, t * S, 8, 96), band); tor.rotation.x = Math.PI / 2; tor.position.y = y * S; g.add(tor);
  }
  // nước chấm trong chén
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d')!;
  const gr = x.createRadialGradient(64, 64, 6, 64, 64, 64); gr.addColorStop(0, '#B86A2A'); gr.addColorStop(1, '#5A2C10');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 18; i++) { x.fillStyle = `rgba(214,48,30,${0.5 + rnd() * 0.4})`; x.beginPath(); x.arc(20 + rnd() * 88, 20 + rnd() * 88, 2 + rnd() * 2.5, 0, Math.PI * 2); x.fill(); }
  const sauce = new THREE.Mesh(new THREE.CircleGeometry((R - 14) * S, 48), new THREE.MeshPhysicalMaterial({ map: canvasTex(c, 4), roughness: 0.08, clearcoat: 1 }));
  sauce.rotation.x = -Math.PI / 2; sauce.position.y = 19 * S; g.add(sauce);
  return g;
}

function chopsticks(): THREE.Group {
  const g = new THREE.Group();
  const wood = new THREE.MeshPhysicalMaterial({ color: '#2B1A10', roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.25 });
  const tip = new THREE.MeshPhysicalMaterial({ color: '#C9A15A', roughness: 0.3, metalness: 0.6 });
  // gác đũa sứ nhỏ
  const rest = new THREE.Mesh(new THREE.CapsuleGeometry(4.2 * S, 18 * S, 6, 16), new THREE.MeshPhysicalMaterial({ color: '#F4F1EA', roughness: 0.2, clearcoat: 1 }));
  rest.rotation.x = Math.PI / 2; rest.position.set(70 * S, 4.2 * S, 0); rest.castShadow = true; g.add(rest);
  for (const dz of [-5.5, 5.5]) {
    const L = 235;
    const geo = new THREE.CylinderGeometry(1.6 * S, 2.9 * S, L * S, 14);
    const ch = new THREE.Mesh(geo, wood);
    ch.rotation.z = Math.PI / 2; ch.position.set(0, 0, 0);
    const pivot = new THREE.Group(); pivot.add(ch);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(2.75 * S, 2.85 * S, 10 * S, 14), tip);
    band.rotation.z = Math.PI / 2; band.position.set(-(L / 2 - 22) * S, 0, 0); pivot.add(band);
    // đầu thon tựa gác, đuôi chạm bàn
    pivot.position.set(10 * S, 5.6 * S, dz * S); pivot.rotation.z = -0.045;
    ch.castShadow = true; g.add(pivot);
  }
  return g;
}

export function wetwipeBuilder(o: WW3DOpts): Builder {
  return async (aniso) => {
    if (!o.front || !o.back) throw new Error('Chưa dựng xong thiết kế');
    seed = 5;
    const { L, W, E } = o;
    const [ft, bt] = await Promise.all([svgTex(o.front, o.fontCss, 2048, aniso), svgTex(o.back, o.fontCss, 2048, aniso)]);
    const silver = o.paper === 'silver';
    const bump = canvasTex(crimpBump(L, W, E), aniso); bump.colorSpace = THREE.NoColorSpace;
    const bumpT = canvasTex(crimpBump(L, W, E, L - E * 0.7), aniso); bumpT.colorSpace = THREE.NoColorSpace;
    const alpha = canvasTex(edgeAlpha(L, W), aniso); alpha.colorSpace = THREE.NoColorSpace;
    const alphaT = canvasTex(edgeAlpha(L, W, L - E * 0.7), aniso); alphaT.colorSpace = THREE.NoColorSpace;
    const face = (map: THREE.Texture, b: THREE.Texture, a: THREE.Texture) => silver
      ? new THREE.MeshPhysicalMaterial({ map, metalness: 0.62, roughness: 0.3, clearcoat: 0.55, clearcoatRoughness: 0.18, bumpMap: b, bumpScale: 0.9, alphaMap: a, alphaTest: 0.5 })
      : new THREE.MeshPhysicalMaterial({ map, metalness: 0, roughness: 0.42, clearcoat: 0.65, clearcoatRoughness: 0.22, bumpMap: b, bumpScale: 0.7, alphaMap: a, alphaTest: 0.5 });
    const plain = silver
      ? new THREE.MeshPhysicalMaterial({ color: '#D3D6DA', metalness: 0.7, roughness: 0.3, clearcoat: 0.4 })
      : new THREE.MeshPhysicalMaterial({ color: o.bgHex || '#F7F7F4', roughness: 0.45, clearcoat: 0.5 });
    const inner = (side: THREE.Side) => new THREE.MeshStandardMaterial({ color: silver ? '#B9BDC2' : '#ECEBE6', roughness: 0.5, metalness: silver ? 0.5 : 0, side, alphaMap: alphaT, alphaTest: 0.5 });
    const mats: SachetMats = { top: face(ft, bump, alpha), bot: face(bt, bump, alpha), fin: plain, innerTop: inner(THREE.BackSide), innerBot: inner(THREE.BackSide) };
    const matsT: SachetMats = { ...mats, top: face(ft, bumpT, alphaT), bot: face(bt, bumpT, alphaT) };
    const fb = canvasTex(fabricBump(), aniso); fb.colorSpace = THREE.NoColorSpace; fb.wrapS = fb.wrapT = THREE.RepeatWrapping; fb.repeat.set(3, 2);
    const wipeMat = new THREE.MeshStandardMaterial({ color: '#FBFBF8', roughness: 0.95, bumpMap: fb, bumpScale: 1.2 });

    const g = new THREE.Group();
    const k = L / 200; // bố cục co theo khổ gói

    // ---- mặt bàn gỗ (mép mờ dần, không thành tấm thớt) ----
    const TW = 1700, TD = 1300;
    const wt = canvasTex(woodCanvas([104, 66, 40], 2048), aniso); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(1.15, 1.6);
    const ta = canvasTex(radialAlpha(), aniso); ta.colorSpace = THREE.NoColorSpace;
    const table = new THREE.Mesh(new THREE.PlaneGeometry(TW * S, TD * S), new THREE.MeshPhysicalMaterial({ map: wt, roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.3, alphaMap: ta, transparent: true, depthWrite: false }));
    table.rotation.x = -Math.PI / 2; table.position.y = 0.05 * S; table.receiveShadow = true; table.renderOrder = -1;
    // mặt bàn KHÔNG tính vào khung nhìn (bbox thu về 1 điểm) → camera ôm sát các vật, bàn tràn khung
    table.geometry.computeBoundingSphere();
    table.geometry.boundingBox = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0));
    g.add(table);

    // ---- chén nước chấm + đũa (góc trái-sau) ----
    // đặt theo mép trái gói khăn (đũa dài cố định 235mm → không đè lên gói khi gói nhỏ)
    const bw = bowl(o.accent); bw.position.set(-(L / 2 + 145) * S, 0, -92 * k * S); g.add(bw);
    const cs = chopsticks(); cs.position.set(-(L / 2 + 112) * S, 0, 58 * k * S); cs.rotation.y = 0.95; g.add(cs);

    // ---- các gói khăn ----
    const A = sachet(L, W, E, mats); A.position.set(-8 * k * S, 0, 62 * k * S); A.rotation.y = -0.07; g.add(A);
    // gói lật mặt sau (lật quanh trục dài X)
    const B0 = sachet(L, W, E, mats);
    const Bf = new THREE.Group(); Bf.add(B0); B0.rotation.x = Math.PI;
    const bb = new THREE.Box3().setFromObject(Bf); B0.position.y = -bb.min.y;
    Bf.position.set(70 * k * S, 0, -52 * k * S); Bf.rotation.y = 0.2; g.add(Bf);
    // gói đã xé
    const C = sachet(L, W, E, matsT, true, wipeMat); C.position.set(210 * k * S, 0, 78 * k * S); C.rotation.y = 0.52; g.add(C);

    // canh giữa cảnh theo các vật (không theo mặt bàn)
    const box = new THREE.Box3();
    for (const ob of [A, Bf, C, bw, cs]) box.expandByObject(ob);
    const c = box.getCenter(new THREE.Vector3());
    const out = new THREE.Group(); g.position.set(-c.x, 0, -c.z); out.add(g);
    // mặt bàn chỉ đặt tâm theo cảnh, không làm khung nhìn rộng ra: thu nhỏ bbox bằng cách cho nó nằm trong cụm
    return { group: out, view: { az: 0.1, el: 0.86 }, aim: 0.2, zoom: 1.5, blob: 0 };
  };
}
