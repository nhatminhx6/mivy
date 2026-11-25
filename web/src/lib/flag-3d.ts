'use client';
// Cờ 3D: chủ shop thấy cờ THẬT dựng trước cửa hàng.
// - Phướn: vải polyester bay nhẹ (lưới đỉnh dịch chuyển, càng xa cột càng gợn), cột sợi thuỷ tinh uốn cong theo
//   mép trên cờ, ống luồn vải tối, chân chữ thập hoặc chân bình nước. Mặt sau: in 1 mặt = mực thấm xuyên (thấy ngược, nhạt
//   hơn); in 2 mặt = tấm mặt sau riêng, chữ xuôi.
// - Cờ dây: dây võng giữa 2 cột gỗ, mỗi lá treo theo độ dốc dây, đung đưa nhẹ.
// - Cờ cầm tay: 1 cờ cắm đế tròn để bàn + 1 cờ nằm trên mặt bàn.
// Texture = SVG thiết kế của khách (nền trong suốt ngoài dáng cờ → alphaTest cắt đúng dáng).

import * as THREE from 'three';
import { S, svgTex, type Builder } from './mockup3d';
import { PENNANT_SIZES, fgPalette, pennantShape, phuonShape, pieceSize, type FGSpec } from './flag-engine';

export interface Flag3DOpts {
  spec: FGSpec;
  front: SVGSVGElement | null;   // tấm cờ (phướn/cầm tay) không lề xén, có ống luồn
  back: SVGSVGElement | null;    // tấm mặt sau (in 2 mặt)
  pennants: SVGSVGElement[];     // từng lá cờ dây
  fontCss: string;
}

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function clothMats(front: THREE.Texture, back: THREE.Texture | null, oneSided: boolean) {
  const base = { roughness: 0.78, metalness: 0, sheen: 0.45, sheenRoughness: 0.55, sheenColor: new THREE.Color('#ffffff'), alphaTest: 0.5 };
  const f = new THREE.MeshPhysicalMaterial({ ...base, map: front, side: THREE.FrontSide });
  // in 1 mặt: mặt sau thấy hình ngược, nhạt (mực thấm qua vải)
  const b = new THREE.MeshPhysicalMaterial({ ...base, map: back ?? front, side: THREE.BackSide, color: oneSided ? new THREE.Color('#D9D6D2') : new THREE.Color('#FFFFFF') });
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: front, alphaTest: 0.5, side: THREE.DoubleSide });
  return { f, b, depth };
}

// lưới vải x∈[0,W], y∈[0,H] (mm, y xuống). pos(x,y) → toạ độ thế giới. UV theo khung texture (có ống luồn bên trái).
function clothGeo(W: number, H: number, SLV: number, nx: number, ny: number, pos: (x: number, y: number) => THREE.Vector3): THREE.BufferGeometry {
  const verts: number[] = [], uvs: number[] = [], idx: number[] = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const x = (i / nx) * W, y = (j / ny) * H;
    const p = pos(x, y);
    verts.push(p.x, p.y, p.z);
    uvs.push((x + SLV) / (W + SLV), 1 - y / H);
  }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function tube(pts: THREE.Vector3[], r: number, mat: THREE.Material, seg = 120): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), seg, r, 12, false), mat);
  m.castShadow = true;
  return m;
}

function crossBase(): THREE.Group {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: '#2B2E33', metalness: 0.6, roughness: 0.42 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.9 });
  for (let k = 0; k < 4; k++) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(420 * S, 22 * S, 38 * S), metal);
    const a = (k * Math.PI) / 2 + Math.PI / 4;
    leg.position.set(Math.cos(a) * 210 * S, 24 * S, Math.sin(a) * 210 * S);
    leg.rotation.y = -a;
    leg.castShadow = true; g.add(leg);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(24 * S, 28 * S, 14 * S, 20), rubber);
    foot.position.set(Math.cos(a) * 400 * S, 7 * S, Math.sin(a) * 400 * S);
    foot.castShadow = true; g.add(foot);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(34 * S, 40 * S, 150 * S, 24), metal);
  hub.position.y = 80 * S; hub.castShadow = true; g.add(hub);
  return g;
}
function waterBase(): THREE.Group {
  const g = new THREE.Group();
  const prof = [[0, 0], [300, 0], [312, 14], [305, 60], [260, 130], [180, 185], [70, 215], [48, 260], [40, 330], [0, 330]].map(([r, y]) => new THREE.Vector2(r * S, y * S));
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), new THREE.MeshPhysicalMaterial({ color: '#1B1D21', roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 }));
  body.castShadow = true; g.add(body);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(60 * S, 60 * S, 26 * S, 32), new THREE.MeshStandardMaterial({ color: '#D7261E', roughness: 0.5 }));
  cap.position.set(170 * S, 175 * S, 0); cap.rotation.z = 0.55; g.add(cap);
  return g;
}

// ---------------- PHƯỚN ----------------
async function buildPhuon(o: Flag3DOpts, aniso: number) {
  const { spec } = o;
  const { w: W, h: H, sleeve: SLV } = pieceSize(spec);
  const sh = phuonShape(spec.shape, W, H);
  const pal = fgPalette(spec.palette);
  const outW = Math.round(4096 * ((W + SLV) / H));
  const front = await svgTex(o.front!, o.fontCss, outW, aniso, '');
  let back: THREE.Texture | null = null;
  if (spec.sides === 2 && o.back) {
    back = await svgTex(o.back, o.fontCss, outW, aniso, '');
    back.wrapS = THREE.RepeatWrapping; back.repeat.x = -1; back.offset.x = 1; back.needsUpdate = true;
  }
  const G0 = spec.height * 100 - H * 1.05; // khoảng hở dưới cờ
  const Y = (y: number) => (G0 + (H - y)) * S;
  // mép trên gắn cột: y theo x
  const top = sh.top;
  const topY = (x: number) => {
    for (let i = 1; i < top.length; i++) if (x <= top[i][0]) { const [x0, y0] = top[i - 1], [x1, y1] = top[i]; return y0 + ((y1 - y0) * (x - x0)) / Math.max(1e-6, x1 - x0); }
    return top[top.length - 1][1];
  };
  const A1 = W * 0.055, A2 = W * 0.022;
  const disp = (x: number, y: number) => {
    const d = Math.min(x, Math.max(0, y - topY(x)));
    const m = smooth(0, W * 0.5, d);
    return m * (A1 * Math.sin((2 * Math.PI * x) / (W * 1.05) + (y / H) * 1.9) + A2 * Math.sin((2 * Math.PI * y) / (W * 0.62) + (x / W) * 2.2));
  };
  const nx = 46, ny = Math.min(160, Math.round(46 * (H / W)));
  const geo = clothGeo(W, H, SLV, nx, ny, (x, y) => new THREE.Vector3(x * S, Y(y), disp(x, y) * S));
  const mats = clothMats(front, back, spec.sides !== 2);
  const g = new THREE.Group();
  const cf = new THREE.Mesh(geo, mats.f); cf.castShadow = true; cf.customDepthMaterial = mats.depth;
  const cb = new THREE.Mesh(geo, mats.b);
  g.add(cf, cb);

  // cột sợi thuỷ tinh: từ chân đế lên mép trái rồi uốn theo mép trên tới vai cờ
  const poleMat = new THREE.MeshPhysicalMaterial({ color: '#E9E6DF', roughness: 0.35, clearcoat: 0.5 });
  const pts: THREE.Vector3[] = [new THREE.Vector3(0, (spec.base === 'water' ? 300 : 140) * S, 0)];
  for (let k = 1; k <= 6; k++) pts.push(new THREE.Vector3(0, Y(H) * (k / 6) + pts[0].y * (1 - k / 6), 0));
  const leftN = 10;
  for (let k = 1; k <= leftN; k++) { const y = H - (k / leftN) * (H - sh.y0); pts.push(new THREE.Vector3(0, Y(y), 0)); }
  const sleevePts: THREE.Vector3[] = pts.slice(6);
  top.forEach((p, i) => { if (i > 0 && i % 4 === 0) { const v = new THREE.Vector3(p[0] * S, Y(p[1]), 0); pts.push(v); sleevePts.push(v); } });
  g.add(tube(pts, 7 * S, poleMat, 200));
  g.add(tube(sleevePts, 15 * S, new THREE.MeshPhysicalMaterial({ color: pal.sleeve, roughness: 0.85, sheen: 0.3 }), 200));
  // khoá dây buộc góc dưới cờ vào cột
  const strap = new THREE.Mesh(new THREE.TorusGeometry(16 * S, 4 * S, 8, 20), new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.6 }));
  strap.position.set(0, Y(H) - 20 * S, 0); strap.rotation.x = Math.PI / 2; g.add(strap);

  const base = spec.base === 'water' ? waterBase() : crossBase();
  g.add(base);
  return { group: g, view: { az: 0.5, el: 0.1 }, aim: 0.5, zoom: 1.2, blob: 0.5 };
}

// ---------------- CỜ CẦM TAY ----------------
async function buildHand(o: Flag3DOpts, aniso: number) {
  const { spec } = o;
  const { w: W, h: H, sleeve: SLV } = pieceSize(spec);
  const pal = fgPalette(spec.palette);
  const outW = Math.round(2048 * ((W + SLV) / Math.max(W + SLV, H)));
  const front = await svgTex(o.front!, o.fontCss, outW, aniso, '');
  let back: THREE.Texture | null = null;
  if (spec.sides === 2 && o.back) {
    back = await svgTex(o.back, o.fontCss, outW, aniso, '');
    back.wrapS = THREE.RepeatWrapping; back.repeat.x = -1; back.offset.x = 1; back.needsUpdate = true;
  }
  const mats = clothMats(front, back, spec.sides !== 2);
  const stickL = H + 300;
  const wood = new THREE.MeshStandardMaterial({ color: '#B98A5A', roughness: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: '#D9B45A', metalness: 0.9, roughness: 0.25 });
  const make = (wave: number, lying: boolean) => {
    const grp = new THREE.Group();
    const topY = stickL - 25; // mép trên cờ (mm, từ chân que)
    const geo = clothGeo(W, H, SLV, 40, Math.round(40 * (H / W)), (x, y) => {
      const m = smooth(0, W * 0.55, x);
      const z = lying ? m * wave * 0.25 * Math.sin((2 * Math.PI * x) / (W * 0.9)) : m * wave * Math.sin((2 * Math.PI * x) / (W * 0.85) + (y / H) * 1.2);
      const droop = lying ? 0 : H * 0.05 * (x / W) ** 2;
      return new THREE.Vector3(x * S, (topY - y - droop) * S, z * S);
    });
    const cf = new THREE.Mesh(geo, mats.f); cf.castShadow = true; cf.customDepthMaterial = mats.depth;
    grp.add(cf, new THREE.Mesh(geo, mats.b));
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(4.5 * S, 4.5 * S, stickL * S, 16), wood);
    stick.position.y = (stickL / 2) * S; stick.castShadow = true; grp.add(stick);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(9 * S, 20, 14), gold);
    tip.position.y = (stickL + 6) * S; tip.castShadow = true; grp.add(tip);
    const slv = new THREE.Mesh(new THREE.CylinderGeometry(8 * S, 8 * S, H * S, 16), new THREE.MeshPhysicalMaterial({ color: pal.sleeve, roughness: 0.85, sheen: 0.3 }));
    slv.position.y = (topY - H / 2) * S; slv.castShadow = true; grp.add(slv);
    return grp;
  };
  const g = new THREE.Group();
  // cờ đứng trên đế tròn
  const stand = make(H * 0.07, false);
  const baseMat = new THREE.MeshStandardMaterial({ color: '#C9CDD3', metalness: 0.9, roughness: 0.22 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(52 * S, 60 * S, 18 * S, 40), baseMat);
  base.position.y = 9 * S; base.castShadow = true;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(11 * S, 14 * S, 40 * S, 24), baseMat);
  neck.position.y = 36 * S; neck.castShadow = true;
  stand.position.y = 20 * S;
  g.add(base, neck, stand);
  // cờ nằm trên bàn, hơi xoay
  const lie = make(H * 0.05, true);
  lie.rotation.set(-Math.PI / 2, 0, 0);
  lie.position.set(0, 12 * S, 0);
  const wrap = new THREE.Group(); wrap.add(lie); wrap.rotation.y = 0.22; wrap.position.set(-W * 1.2 * S, 0, (H * 0.55 + stickL * 0.5) * S);
  g.add(wrap);
  return { group: g, view: { az: 0.32, el: 0.32 }, aim: 0.4, zoom: 1.25, blob: 0.4 };
}

// ---------------- CỜ DÂY ----------------
async function buildBunting(o: Flag3DOpts, aniso: number) {
  const { spec } = o;
  const { w: W, h: H } = PENNANT_SIZES[spec.pSize];
  const n = o.pennants.length;
  const texs = await Promise.all(o.pennants.map((el) => svgTex(el, o.fontCss, 512, aniso, '')));
  const gap = W * 0.18, m = W * 0.6;
  const span = n * W + (n - 1) * gap + m * 2;
  const attach = Math.max(1150, H * 3.2), postH = attach + 70;
  const sag = Math.min(span * 0.06, postH * 0.3);
  const yAt = (x: number) => attach - sag * 4 * (x / span) * (1 - x / span);
  const g = new THREE.Group();
  // dây
  const rope = Array.from({ length: 41 }, (_, i) => { const x = (i / 40) * span; return new THREE.Vector3(x * S, yAt(x) * S, 0); });
  g.add(tube(rope, 2.2 * S, new THREE.MeshStandardMaterial({ color: '#EFEBE2', roughness: 0.9 }), 160));
  // cột gỗ + đế
  const wood = new THREE.MeshStandardMaterial({ color: '#9A6B43', roughness: 0.65 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2B2E33', metalness: 0.5, roughness: 0.45 });
  for (const x of [0, span]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(16 * S, 18 * S, postH * S, 20), wood);
    post.position.set(x * S, (postH / 2) * S, -8 * S); post.castShadow = true; g.add(post);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(120 * S, 130 * S, 22 * S, 32), dark);
    foot.position.set(x * S, 11 * S, -8 * S); foot.castShadow = true; g.add(foot);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(22 * S, 16, 12), wood);
    cap.position.set(x * S, postH * S, -8 * S); g.add(cap);
  }
  // các lá cờ
  const shp = pennantShape(spec.pennant, W, H);
  const shape = new THREE.Shape(shp.poly.map(([x, y]) => new THREE.Vector2(x * S, -y * S)));
  const geo = new THREE.ShapeGeometry(shape);
  const pos = geo.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) / (W * S); uv[i * 2 + 1] = 1 + pos.getY(i) / (H * S); }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = 0; i < n; i++) {
    const x0 = m + i * (W + gap);
    const slope = Math.atan2(yAt(x0 + W) - yAt(x0), W);
    const pivot = new THREE.Group();
    pivot.position.set(x0 * S, yAt(x0) * S, 0);
    pivot.rotation.z = slope;
    const sway = new THREE.Group(); sway.rotation.x = (rnd() - 0.5) * 0.36; pivot.add(sway);
    const base = { roughness: 0.8, sheen: 0.4, sheenRoughness: 0.6, sheenColor: new THREE.Color('#ffffff'), alphaTest: 0.4 };
    const f = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ ...base, map: texs[i], side: THREE.FrontSide }));
    f.castShadow = true;
    const b = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ ...base, map: texs[i], side: THREE.BackSide, color: '#D2CEC8' }));
    sway.add(f, b);
    // ống luồn dây (viền gấp phía trên)
    const hem = new THREE.Mesh(new THREE.BoxGeometry(W * S, 14 * S, 5 * S), new THREE.MeshStandardMaterial({ color: '#F2EFE8', roughness: 0.85 }));
    hem.position.set((W / 2) * S, -4 * S, 0); sway.add(hem);
    g.add(pivot);
  }
  return { group: g, view: { az: 0.18, el: 0.04 }, aim: 0.7, zoom: n > 12 ? 1.55 : 1.72, blob: 0.35, swing: 0.6 };
}

export function flagBuilder(o: Flag3DOpts): Builder {
  return async (aniso) => {
    if (o.spec.kind === 'bunting') {
      if (!o.pennants.length) throw new Error('Chưa dựng xong cờ dây');
      return buildBunting(o, aniso);
    }
    if (!o.front) throw new Error('Chưa dựng xong cờ');
    return o.spec.kind === 'phuon' ? buildPhuon(o, aniso) : buildHand(o, aniso);
  };
}
