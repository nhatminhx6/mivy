'use client';
// Hộp ống tròn 3D: thân ống giấy bồi (thành dày ~1.8mm, mép cuộn tròn), giấy quấn in = texture trụ đúng chu vi
// (mặt trước ở 1/4 chu vi → quay về máy ảnh), nắp rời chụp ngoài hoặc nắp liền vai có cổ trong màu tương phản.
// Cảnh: 1 ống đóng nắp + 1 ống mở nắp (thấy cổ / mép gấp trong + hàng bên trong: trà, hạt cà phê, nến, khăn cuộn,
// cổ chai vang, cuộn poster) + nắp nằm nghiêng bên cạnh khoe tem mặt nắp. Ép kim = metalnessMap từ khuôn ép.

import * as THREE from 'three';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';
import { FRONT_U, KRAFT, TB_TURN, TB_WALL, inkOf, tbPalette, tubeGeom, type TBIndustry, type TBSpec } from './tube-engine';

export interface Tube3DOpts {
  spec: TBSpec; fontCss: string;
  body: SVGSVGElement | null; lid: SVGSVGElement | null; top: SVGSVGElement | null;
  foilBody?: SVGSVGElement | null; foilLid?: SVGSVGElement | null; foilTop?: SVGSVGElement | null;
}

let seed = 7;
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

/** sợi giấy (bump) — kraft: sợi rõ; giấy bồi cán màng: hạt rất mịn */
function fiberTex(aniso: number, kraft: boolean): THREE.CanvasTexture {
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d')!;
  x.fillStyle = '#808080'; x.fillRect(0, 0, N, N);
  seed = kraft ? 11 : 5;
  const n = kraft ? 2600 : 1400;
  for (let i = 0; i < n; i++) {
    const px = rnd() * N, py = rnd() * N, len = kraft ? 4 + rnd() * 14 : 1 + rnd() * 2, a = rnd() * Math.PI;
    x.strokeStyle = rnd() > 0.5 ? `rgba(255,255,255,${kraft ? 0.35 : 0.18})` : `rgba(0,0,0,${kraft ? 0.3 : 0.14})`;
    x.lineWidth = kraft ? 0.8 + rnd() * 0.8 : 0.8;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len); x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso; t.colorSpace = THREE.NoColorSpace;
  return t;
}

async function foilMaps(el: SVGSVGElement, fontCss: string, px: number, aniso: number) {
  const mt = await svgTex(el, fontCss, px, aniso, '#000000');
  mt.colorSpace = THREE.NoColorSpace;
  const src = mt.image as HTMLCanvasElement;
  const rc = document.createElement('canvas'); rc.width = src.width; rc.height = src.height;
  const rx = rc.getContext('2d')!; rx.drawImage(src, 0, 0);
  const id = rx.getImageData(0, 0, rc.width, rc.height);
  for (let i = 0; i < id.data.length; i += 4) { const v = 255 - id.data[i] * 0.5; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; }
  rx.putImageData(id, 0, 0);
  const rt = new THREE.CanvasTexture(rc); rt.anisotropy = aniso; rt.colorSpace = THREE.NoColorSpace;
  return { mt, rt };
}

function darken(hex: string, k: number): string {
  const c = new THREE.Color(hex); c.multiplyScalar(1 - k); return `#${c.getHexString()}`;
}

interface Mats { body: THREE.Material; lid: THREE.Material; top: THREE.Material; bodyPaper: THREE.Material; lidPaper: THREE.Material; lining: THREE.Material; liningFront: THREE.Material; neck: THREE.Material; board: THREE.Material }

async function makeMats(o: Tube3DOpts, aniso: number): Promise<Mats> {
  const { spec } = o;
  const g = tubeGeom(spec);
  const ink = inkOf(spec);
  const kraft = spec.finish === 'kraft';
  const fiber = fiberTex(aniso, kraft);
  const paperProps = (): THREE.MeshPhysicalMaterialParameters => kraft
    ? { roughness: 0.9, metalness: 0, bumpMap: fiber, bumpScale: 0.9, sheen: 0.15, sheenRoughness: 0.8 }
    : { roughness: 0.42, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.32, bumpMap: fiber, bumpScale: 0.15 };
  const printed = async (el: SVGSVGElement | null, foil: SVGSVGElement | null | undefined, wMm: number, fallback: string, repeat: [number, number]) => {
    if (!el) return new THREE.MeshPhysicalMaterial({ color: fallback, ...paperProps() });
    const px = Math.max(512, Math.min(3072, Math.round(wMm * 11)));
    const map = await svgTex(el, o.fontCss, px, aniso, '');
    const f = fiber.clone(); f.repeat.set(repeat[0], repeat[1]); f.needsUpdate = true;
    const params: THREE.MeshPhysicalMaterialParameters = { map, ...paperProps(), bumpMap: f };
    if (spec.foil && foil) {
      const { mt, rt } = await foilMaps(foil, o.fontCss, px, aniso);
      Object.assign(params, { metalness: 1, metalnessMap: mt, roughness: kraft ? 0.85 : 0.6, roughnessMap: rt, clearcoat: kraft ? 0 : 0.2 });
    }
    return new THREE.MeshPhysicalMaterial(params);
  };
  const [body, lid, top] = await Promise.all([
    printed(o.body, o.foilBody, g.C, ink.bg, [g.C / 60, g.bodyH / 60]),
    printed(o.lid, o.foilLid, g.Cl, ink.lidBg, [g.Cl / 60, g.lidH / 60]),
    printed(o.top, o.foilTop, g.topD, ink.lidBg, [g.topD / 60, g.topD / 60]),
  ]);
  const p = tbPalette(spec.palette);
  const neckColor = kraft ? '#F3EBDD' : spec.style === 'neck' ? (p.id === 'cream' || p.id === 'sage' || p.id === 'blush' || p.id === 'sky' ? p.accent : p.plate) : p.plate;
  return {
    body, lid, top,
    bodyPaper: new THREE.MeshPhysicalMaterial({ color: ink.bg, ...paperProps() }),
    lidPaper: new THREE.MeshPhysicalMaterial({ color: ink.lidBg, ...paperProps() }),
    lining: new THREE.MeshPhysicalMaterial({ color: kraft ? darken(KRAFT, 0.08) : '#EFEAE2', roughness: 0.9, bumpMap: fiber, bumpScale: 0.4, side: THREE.BackSide }),
    liningFront: new THREE.MeshPhysicalMaterial({ color: kraft ? darken(KRAFT, 0.14) : '#E6E0D6', roughness: 0.9, bumpMap: fiber, bumpScale: 0.4 }),
    neck: new THREE.MeshPhysicalMaterial({ color: neckColor, roughness: 0.55, clearcoat: kraft ? 0 : 0.25, bumpMap: fiber, bumpScale: 0.2 }),
    board: new THREE.MeshStandardMaterial({ color: kraft ? '#A98A62' : '#B9AE9C', roughness: 0.95 }),
  };
}

/** trụ hở 2 đầu, u = FRONT_U quay về +z */
function sleeve(r: number, h: number, y0: number, mat: THREE.Material, seg = 128): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(r * S, r * S, h * S, seg, 1, true, -Math.PI * 2 * FRONT_U, Math.PI * 2);
  const m = new THREE.Mesh(geo, mat);
  m.position.y = (y0 + h / 2) * S; m.castShadow = true; m.receiveShadow = true;
  return m;
}
function ringAt(r0: number, r1: number, y: number, mat: THREE.Material, up = true): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.RingGeometry(r0 * S, r1 * S, 128), mat);
  m.rotation.x = up ? -Math.PI / 2 : Math.PI / 2; m.position.y = y * S; m.receiveShadow = true;
  return m;
}
function roll(r: number, y: number, mat: THREE.Material, t = 0.75): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r * S, t * S, 10, 160), mat);
  m.rotation.x = Math.PI / 2; m.position.y = y * S; m.castShadow = true;
  return m;
}
function disc(r: number, y: number, mat: THREE.Material, up = true): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r * S, 128), mat);
  m.rotation.x = up ? -Math.PI / 2 : Math.PI / 2; m.position.y = y * S; m.receiveShadow = true;
  return m;
}

/** nắp (gốc toạ độ = mép dưới nắp, trục +y) */
function lidGroup(o: Tube3DOpts, M: Mats): THREE.Group {
  const g = tubeGeom(o.spec);
  const L = new THREE.Group();
  const rl = g.lidD / 2;
  L.add(sleeve(rl, g.lidH, 0, M.lid));
  // mặt nắp: tem tròn + vành giấy gập lên (màu nền nắp) + mép cuộn
  L.add(ringAt(g.topD / 2 - 0.2, rl, g.lidH, M.lidPaper));
  const topD = disc(g.topD / 2, g.lidH + 0.12, M.top);
  topD.rotation.z = 0; L.add(topD);
  L.add(roll(rl - 0.45, g.lidH - 0.2, M.lidPaper, 0.65));
  L.add(roll(rl - 0.2, 0.5, M.lidPaper, 0.55));
  // trong nắp: lót + đáy
  const inner = sleeve(rl - TB_WALL, g.lidH - 0.5, 0.2, M.lining);
  inner.castShadow = false; L.add(inner);
  L.add(ringAt(rl - TB_WALL, rl, 0.05, M.board, false));
  L.add(disc(rl - TB_WALL, g.lidH - 1.4, M.liningFront, false));
  return L;
}

/** thân ống (gốc = đáy). open = đang mở nắp → thấy mép/cổ */
function bodyGroup(o: Tube3DOpts, M: Mats, open: boolean): { g: THREE.Group; rimY: number } {
  const g = tubeGeom(o.spec);
  const B = new THREE.Group();
  const r = g.d / 2;
  B.add(sleeve(r, g.bodyH, 0, M.body));
  B.add(disc(r, 0.15, M.bodyPaper, false));
  B.add(roll(r - 0.25, 0.55, M.bodyPaper, 0.6));
  let rimY = g.bodyH;
  if (o.spec.style === 'neck') {
    // cổ trong: ống nhỏ hơn nhô lên, màu tương phản (bị nắp che khi đóng)
    const nr = r - TB_WALL - 0.4, nh = g.lidH - 5;
    B.add(sleeve(nr, nh + 22, g.bodyH - 22, M.neck));
    B.add(ringAt(r - TB_WALL - 0.4, r, g.bodyH + 0.05, M.board));
    B.add(roll(r - 0.3, g.bodyH - 0.4, M.bodyPaper, 0.5));
    rimY = g.bodyH + nh;
    B.add(ringAt(nr - TB_WALL, nr, rimY, M.board));
    if (open) { const lin = sleeve(nr - TB_WALL, nh + 18, g.bodyH - 18, M.lining); lin.castShadow = false; B.add(lin); }
  } else {
    // nắp chụp ngoài: mép trên thân cuộn, giấy gấp mép 15mm vào trong (màu nền), lõi xám
    B.add(roll(r - 0.4, g.bodyH - 0.5, M.bodyPaper, 0.7));
    B.add(ringAt(r - TB_WALL, r - 0.2, g.bodyH + 0.1, M.board));
    if (open) {
      const band = sleeve(r - TB_WALL, TB_TURN, g.bodyH - TB_TURN, new THREE.MeshPhysicalMaterial({ color: inkOf(o.spec).bg, roughness: 0.6, side: THREE.BackSide }));
      band.castShadow = false; B.add(band);
      const lin = sleeve(r - TB_WALL - 0.05, g.bodyH - TB_TURN - 1, 1, M.lining); lin.castShadow = false; B.add(lin);
    }
  }
  if (open) B.add(disc(r - TB_WALL, 1.2, M.liningFront, true));
  return { g: B, rimY };
}

// ---------- hàng bên trong ----------
function contents(ind: TBIndustry, inner: number, rimY: number, aniso: number): THREE.Group {
  const G = new THREE.Group();
  if (ind === 'tea' || ind === 'coffee') {
    // đống trà / hạt cà phê nhô khỏi miệng ống
    seed = ind === 'tea' ? 21 : 33;
    const n = ind === 'tea' ? 520 : 340;
    const geo = ind === 'tea' ? new THREE.SphereGeometry(1, 8, 6) : new THREE.SphereGeometry(1, 12, 8);
    const mat = ind === 'tea'
      ? new THREE.MeshStandardMaterial({ color: '#3B4A22', roughness: 0.8 })
      : new THREE.MeshPhysicalMaterial({ color: '#7A4A26', roughness: 0.38, clearcoat: 0.5 });
    const inst = new THREE.InstancedMesh(geo, mat, n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3(), e = new THREE.Euler();
    const cols = ind === 'tea' ? ['#4A5A2A', '#5C6A32', '#3A4A22', '#6A6E34'] : ['#8A5430', '#9A6036', '#70401F', '#A86C3C'];
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * inner;
      const heap = 7 * (1 - (rr / inner) ** 2) * Math.min(1, inner / 30);
      pos.set(Math.cos(a) * rr * S, (rimY - 3 + heap * rnd() + 1) * S, Math.sin(a) * rr * S);
      e.set(rnd() * 3, rnd() * 3, rnd() * 3); q.setFromEuler(e);
      if (ind === 'tea') sc.set(2.6 * S, 0.5 * S, 1.1 * S); else sc.set(3.6 * S, 2.3 * S, 2.8 * S);
      m.compose(pos, q, sc); inst.setMatrixAt(i, m);
      inst.setColorAt(i, new THREE.Color(cols[i % cols.length]));
    }
    inst.castShadow = true;
    G.add(inst);
    G.add(disc(inner + 1, rimY - 3.5, mat));
  } else if (ind === 'candle') {
    const wax = new THREE.MeshPhysicalMaterial({ color: '#F1E6D2', roughness: 0.55, sheen: 0.4, sheenColor: '#FFFFFF', transmission: 0.05 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#D9DCD8', transparent: true, opacity: 0.35, roughness: 0.05, clearcoat: 1 });
    const jr = inner - 1;
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(jr * S, jr * S, 14 * S, 64, 1, true), glass);
    jar.position.y = (rimY - 4) * S; G.add(jar);
    G.add(disc(jr - 0.8, rimY - 6, wax));
    const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * S, 0.5 * S, 6 * S, 8), new THREE.MeshStandardMaterial({ color: '#2A2420', roughness: 0.9 }));
    wick.position.y = (rimY - 3.5) * S; wick.rotation.z = 0.15; G.add(wick);
  } else if (ind === 'wine') {
    const glass = new THREE.MeshPhysicalMaterial({ color: '#1F3A22', roughness: 0.08, clearcoat: 1, metalness: 0.1 });
    const neckPts = [[30, 0], [30, 40], [26, 58], [16, 78], [14, 92], [14, 120]].map(([x, y]) => new THREE.Vector2(x * S, y * S));
    const bottle = new THREE.Mesh(new THREE.LatheGeometry(neckPts, 64), glass);
    bottle.position.y = (rimY - 60) * S; G.add(bottle);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(15 * S, 15.2 * S, 34 * S, 48), new THREE.MeshPhysicalMaterial({ color: '#7A1626', metalness: 0.7, roughness: 0.32, clearcoat: 0.6 }));
    cap.position.y = (rimY - 60 + 104) * S; G.add(cap);
    G.add(disc(15, rimY - 60 + 121.1, new THREE.MeshPhysicalMaterial({ color: '#8A1E2C', metalness: 0.7, roughness: 0.3 })));
  } else {
    // khăn cuộn / poster cuộn: lõi cuộn nhô lên, mặt cuộn vẽ xoắn ốc
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d')!;
    const base = ind === 'shirt' ? '#E7C9C1' : '#F6F2E9';
    x.fillStyle = base; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = ind === 'shirt' ? '#B98C82' : '#C9BFAE'; x.lineWidth = ind === 'shirt' ? 3 : 1.6;
    x.beginPath();
    for (let t = 0; t < Math.PI * 2 * (ind === 'shirt' ? 7 : 14); t += 0.05) {
      const rr = 6 + (t / (Math.PI * 2)) * (ind === 'shirt' ? 17 : 8.6);
      x.lineTo(128 + Math.cos(t) * rr, 128 + Math.sin(t) * rr);
    }
    x.stroke();
    const capMat = new THREE.MeshStandardMaterial({ map: canvasTex(c, aniso), roughness: 0.85 });
    const sideMat = new THREE.MeshPhysicalMaterial({ color: base, roughness: ind === 'shirt' ? 0.75 : 0.6, sheen: ind === 'shirt' ? 0.8 : 0, sheenColor: '#FFFFFF' });
    const rr = ind === 'shirt' ? inner - 1 : inner - 4;
    const up = ind === 'shirt' ? 18 : 36;
    const rollM = new THREE.Mesh(new THREE.CylinderGeometry(rr * S, rr * S, (up + 30) * S, 64), [sideMat, capMat, capMat]);
    rollM.position.y = (rimY - 30 + (up + 30) / 2) * S; rollM.castShadow = true; G.add(rollM);
    if (ind === 'poster') {
      // mép giấy cuộn hé ra
      const flap = new THREE.Mesh(new THREE.CylinderGeometry((rr + 0.6) * S, (rr + 0.6) * S, 22 * S, 32, 1, true, 0.2, 1.1), new THREE.MeshStandardMaterial({ color: '#FBF8F1', roughness: 0.7, side: THREE.DoubleSide }));
      flap.position.y = (rimY + up - 11) * S; G.add(flap);
    }
  }
  return G;
}

export function tubeBuilder(o: Tube3DOpts): Builder {
  return async (aniso) => {
    if (!o.body) throw new Error('Chưa dựng xong giấy quấn');
    const { spec } = o;
    const g = tubeGeom(spec);
    const M = await makeMats(o, aniso);
    const VIEW_AZ = 0.34;
    const root = new THREE.Group();

    // A: ống đóng nắp (mặt trước nhìn thẳng máy ảnh)
    const A = new THREE.Group();
    A.add(bodyGroup(o, M, false).g);
    const lidA = lidGroup(o, M);
    lidA.position.y = (g.h - g.lidH) * S;
    A.add(lidA);
    if (spec.style === 'neck') A.add(roll(g.d / 2 + 0.05, g.bodyH + 0.1, new THREE.MeshStandardMaterial({ color: '#1A1714', roughness: 0.9 }), 0.28));
    A.rotation.y = VIEW_AZ;
    root.add(A);

    // B: ống mở nắp, xoay khoe mặt sau một phần
    const Bb = bodyGroup(o, M, true);
    const B = new THREE.Group();
    B.add(Bb.g);
    const innerR = (spec.style === 'neck' ? g.d / 2 - TB_WALL * 2 - 0.4 : g.d / 2 - TB_WALL) - 1.2;
    B.add(contents(spec.industry, innerR, Bb.rimY, aniso));
    B.rotation.y = VIEW_AZ - Math.PI + 0.42; // khoe mặt sau (thành phần, mã vạch)
    const tall = g.h > 200;
    B.position.set(-g.d * 1.22 * S, 0, -g.d * 0.55 * S);
    root.add(B);

    // nắp B nằm nghiêng trước mặt, khoe tem mặt nắp
    const lidB = lidGroup(o, M);
    const LB = new THREE.Group();
    lidB.position.y = -g.lidH / 2 * S;
    LB.add(lidB);
    LB.rotation.set(Math.PI / 2 - 0.35, 0, 0);
    const LW = new THREE.Group(); LW.add(LB);
    LW.rotation.y = VIEW_AZ + 0.55;
    root.add(LW);
    LW.updateMatrixWorld(true);
    const lb0 = new THREE.Box3().setFromObject(LW);
    LW.position.y = -lb0.min.y + 0.01 * S;
    LW.position.x = (g.d * (tall ? 0.95 : 1.02)) * S;
    LW.position.z = g.d * (tall ? 0.55 : 0.35) * S;

    // tách nếu chạm nhau
    root.updateMatrixWorld(true);
    const boxA = new THREE.Box3().setFromObject(A);
    for (let i = 0; i < 40; i++) {
      LW.updateMatrixWorld(true);
      const bl = new THREE.Box3().setFromObject(LW);
      if (!bl.intersectsBox(boxA)) break;
      LW.position.x += 3 * S;
    }
    for (let i = 0; i < 40; i++) {
      B.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(B);
      if (!bb.intersectsBox(boxA)) break;
      B.position.x -= 3 * S;
    }
    const zoom = tall ? 1.18 : g.h < 100 ? 1.32 : 1.26;
    return { group: root, view: { az: VIEW_AZ, el: tall ? 0.14 : 0.24 }, aim: tall ? 0.5 : 0.44, zoom, blob: 0.5 };
  };
}

