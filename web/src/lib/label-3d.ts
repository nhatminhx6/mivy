'use client';
// Nhãn chai · hũ · lọ 3D: vật chứa dựng bằng LatheGeometry theo profile thật (mm) — thuỷ tinh trong / xanh / hổ phách,
// chai PET có gân, lon nhôm; chất bên trong đúng màu (mật ong hổ phách, nước mắm nâu, sữa hạt trắng…).
// Nhãn = mặt trụ mở (theta đúng = dài nhãn / bán kính) dán trên đoạn thân thẳng; texture = SVG nhãn của khách
// (decal trong: nền trong suốt → thấy chất bên trong). 2 vật chứa: 1 quay mặt trước, 1 quay vùng thông tin / nhãn sau.

import * as THREE from 'three';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';
import { LIQUID, lbContainer, lbPalette, partDims, wrapCenters, type LBContainerId, type LBMaterial, type LBSpec } from './label-engine';

export interface Label3DOpts {
  spec: LBSpec;
  wrap: SVGSVGElement | null; front: SVGSVGElement | null; back: SVGSVGElement | null;
  cap: SVGSVGElement | null; neck: SVGSVGElement | null;
  fontCss: string;
}

type P2 = [number, number];
interface Shape3D { pts: P2[]; fill: number; wall: number }
function ribbed(): P2[] {
  const out: P2[] = [[0, 0], [22, 0], [28, 1.5], [31.5, 5], [32.5, 10]];
  for (let y = 14; y <= 80; y += 8) out.push([31.3, y], [32.5, y + 4]);
  out.push([32.5, 88], [32.5, 150], [31.6, 158], [27, 170], [20, 180], [15.5, 188], [14.2, 192], [14.2, 198]);
  return out;
}
const SHAPES: Record<LBContainerId, Shape3D> = {
  pet500: { pts: ribbed(), fill: 172, wall: 0.7 },
  glass250: { pts: [[0, 0], [24, 0], [27.6, 1.5], [29, 5], [29, 98], [28.2, 106], [24, 116], [17, 128], [13, 136], [12.5, 140], [12.5, 156], [13.6, 157], [13.6, 160]], fill: 112, wall: 2.4 },
  glass500: { pts: [[0, 0], [30, 0], [33.6, 1.8], [35, 6], [35, 126], [34, 136], [28, 152], [18, 168], [14.5, 178], [14, 182], [14, 212], [15.4, 213], [15.4, 216]], fill: 150, wall: 2.6 },
  wine750: { pts: [[0, 0], [34, 0], [37, 2], [38, 7], [38, 176], [37.2, 188], [32, 202], [23, 218], [17, 234], [14.9, 244], [14.7, 248], [14.7, 292], [16, 293.5], [16, 298]], fill: 206, wall: 3 },
  jar500: { pts: [[0, 0], [34, 0], [37.6, 1.8], [39, 6], [39, 74], [38.4, 79], [35.6, 82.5], [33.6, 84], [33.6, 94]], fill: 82, wall: 2.6 },
  jarpl: { pts: [[0, 0], [30, 0], [33, 1.5], [34, 4], [34, 50], [33.2, 54], [32, 55], [32, 60]], fill: 51, wall: 1.2 },
  dropper30: { pts: [[0, 0], [12, 0], [15, 1.2], [16, 4], [16, 54], [15.2, 59], [11.5, 63], [9.2, 65], [9.2, 70]], fill: 44, wall: 1.8 },
  can330: { pts: [[0, 0], [25, 0], [27, 0.6], [29.5, 2.5], [31.5, 6], [33, 11], [33, 111], [32.4, 114], [29.8, 118.5], [28.4, 120.5], [28.8, 121.6], [27.6, 122]], fill: 0, wall: 0 },
};
const v2 = (p: P2[]) => p.map(([r, y]) => new THREE.Vector2(Math.max(0, r) * S, y * S));
const rAt = (pts: P2[], y: number) => {
  for (let i = 1; i < pts.length; i++) {
    const [r0, y0] = pts[i - 1], [r1, y1] = pts[i];
    if (y >= Math.min(y0, y1) && y <= Math.max(y0, y1) && y1 !== y0) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
  }
  return pts[pts.length - 1][0];
};

function glassMat(kind: string): THREE.Material {
  if (kind === 'metal') return new THREE.MeshPhysicalMaterial({ color: '#CDD2D9', metalness: 1, roughness: 0.26, clearcoat: 0.4 });
  const tint = kind === 'green' ? '#2F5A2E' : kind === 'amber' ? '#7A3E0E' : '#EEF6F3';
  const op = kind === 'green' ? 0.6 : kind === 'amber' ? 0.56 : kind === 'pet' ? 0.08 : 0.1;
  return new THREE.MeshPhysicalMaterial({
    color: tint, transparent: true, opacity: op, roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03,
    ior: 1.5, specularIntensity: 1, depthWrite: false, side: THREE.DoubleSide,
  });
}
function noiseTex(aniso: number, base: string, dots: string): THREE.CanvasTexture {
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d')!; x.fillStyle = base; x.fillRect(0, 0, N, N);
  let s = 9; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < 2600; i++) { x.fillStyle = dots; x.globalAlpha = 0.25 + rnd() * 0.5; x.fillRect(rnd() * N, rnd() * N, 1 + rnd() * 2.5, 1 + rnd() * 2.5); }
  const t = canvasTex(c, aniso); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4); return t;
}
/** chất lỏng: sẫm dần về đáy (độ dày lớp nước) — UV lathe: v = dọc profile */
function depthTex(aniso: number, color: string): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 4; c.height = 128;
  const x = c.getContext('2d')!;
  const gr = x.createLinearGradient(0, 0, 0, 128);
  const shade = (k: number) => { const h = color.replace('#', ''); const v = [0, 2, 4].map((i) => Math.round(parseInt(h.slice(i, i + 2), 16) * k)); return `rgb(${v.join(',')})`; };
  gr.addColorStop(0, shade(0.62)); gr.addColorStop(0.5, shade(0.9)); gr.addColorStop(1, shade(1.1)); // flipY=false: hàng 0 = đáy
  x.fillStyle = gr; x.fillRect(0, 0, 4, 128);
  const t = canvasTex(c, aniso); t.flipY = false; return t;
}
/** nắp có gân dọc: trụ nhiều cạnh, bán kính dao động theo góc */
function ridgedCap(R: number, h: number, color: string, metal: number, rough: number, ridges = 60): THREE.Group {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(R * S, R * S, h * S, ridges * 4, 1, true);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), a = Math.atan2(x, z);
    const k = 1 + 0.012 * Math.cos(a * ridges);
    pos.setX(i, x * k); pos.setZ(i, z * k);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshPhysicalMaterial({ color, metalness: metal, roughness: rough, clearcoat: metal > 0.5 ? 0.3 : 0.6, side: THREE.DoubleSide });
  const side = new THREE.Mesh(geo, mat); side.position.y = (h / 2) * S; side.castShadow = true;
  const top = new THREE.Mesh(new THREE.LatheGeometry(v2([[R, h - 0.6], [R - 0.4, h + 0.2], [R - 1.6, h + 0.6], [0, h + 0.6]]), 96), mat);
  top.castShadow = true;
  g.add(side, top);
  return g;
}

function labelMat(tex: THREE.Texture, m: LBMaterial): THREE.Material {
  const base = { map: tex, side: THREE.FrontSide } as const;
  if (m === 'clear') return new THREE.MeshPhysicalMaterial({ ...base, transparent: true, alphaTest: 0.04, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, depthWrite: true });
  if (m === 'kraft') return new THREE.MeshPhysicalMaterial({ ...base, alphaTest: 0.5, roughness: 0.92, sheen: 0.2 });
  if (m === 'milky') return new THREE.MeshPhysicalMaterial({ ...base, alphaTest: 0.5, roughness: 0.26, clearcoat: 0.9, clearcoatRoughness: 0.12 });
  return new THREE.MeshPhysicalMaterial({ ...base, alphaTest: 0.5, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.22 });
}
/** mặt trụ nhãn: tâm nhãn hướng +z (theta = 0), dài wMm quanh bán kính r, đáy ở y0 */
function labelBand(tex: THREE.Texture, m: LBMaterial, r: number, wMm: number, hMm: number, y0: number, centerAt = 0): THREE.Group {
  const g = new THREE.Group();
  const R = r + 0.28;
  const len = Math.min(Math.PI * 2 * 0.999, wMm / R);
  const start = centerAt - len / 2;
  const seg = Math.max(32, Math.round(len * 40));
  const geo = new THREE.CylinderGeometry(R * S, R * S, hMm * S, seg, 1, true, start, len);
  const front = new THREE.Mesh(geo, labelMat(tex, m));
  front.position.y = (y0 + hMm / 2) * S; front.castShadow = m !== 'clear'; front.renderOrder = 2;
  g.add(front);
  // mặt lưng nhãn (nhìn xuyên thuỷ tinh): giấy = trắng, decal trong = thấy ngược mực
  const backMat = m === 'clear'
    ? new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.04, roughness: 0.5, side: THREE.BackSide })
    : new THREE.MeshStandardMaterial({ color: m === 'kraft' ? '#B99467' : '#F4F2EE', roughness: 0.8, side: THREE.BackSide });
  const back = new THREE.Mesh(geo, backMat);
  back.position.copy(front.position); back.renderOrder = 1;
  g.add(back);
  return g;
}

function capColor(spec: LBSpec): { color: string; metal: number; rough: number } {
  const p = lbPalette(spec.palette);
  if (spec.container === 'jarpl') return { color: '#F5F5F2', metal: 0, rough: 0.35 };
  if (spec.container === 'pet500') return { color: p.accent, metal: 0, rough: 0.32 };
  if (['honey', 'liquor', 'fishsauce'].includes(spec.industry)) return { color: '#C9A24A', metal: 0.9, rough: 0.3 };
  return { color: '#1E1E1E', metal: 0.5, rough: 0.38 };
}

async function item(o: Label3DOpts, tex: Record<string, THREE.Texture | null>, aniso: number): Promise<THREE.Group> {
  const { spec } = o;
  const c = lbContainer(spec.container), sh = SHAPES[spec.container];
  const g = new THREE.Group();
  // thân
  const body = new THREE.Mesh(new THREE.LatheGeometry(v2(sh.pts), 128), glassMat(c.glass));
  body.renderOrder = c.glass === 'metal' ? 0 : 3; body.castShadow = true; body.receiveShadow = false;
  g.add(body);
  // chất bên trong
  if (c.glass !== 'metal') {
    const L = LIQUID[spec.industry];
    const base = c.glass === 'pet' ? 1 : 3.2;
    const fy = sh.fill;
    const inner: P2[] = [[0, base]];
    for (const [r, y] of sh.pts) if (y > base && y < fy) inner.push([r - sh.wall, y]);
    inner.splice(1, 0, [rAt(sh.pts, base + 2) - sh.wall - 1.5, base]);
    inner.push([rAt(sh.pts, fy) - sh.wall, fy], [0, fy]);
    const liqMat = new THREE.MeshPhysicalMaterial({
      color: '#FFFFFF', transparent: L.opacity < 1, opacity: L.opacity, roughness: L.grain ? 0.9 : 0.24,
      clearcoat: L.grain ? 0 : 0.25, clearcoatRoughness: 0.3, specularIntensity: 0.35, depthWrite: L.opacity > 0.6,
      map: L.grain ? noiseTex(aniso, L.color, '#5A0E08') : depthTex(aniso, L.color),
    });
    const liq = new THREE.Mesh(new THREE.LatheGeometry(v2(inner), 96), liqMat);
    liq.renderOrder = 1;
    g.add(liq);
  }
  // nhãn
  const lc = wrapCenters(spec);
  if (spec.style === 'wrap' && tex.wrap) {
    const d = partDims(spec, 'wrap');
    // tâm mặt trước (u = lc.front) nằm ở theta = 0
    const len = Math.min(Math.PI * 2 * 0.999, d.w / (c.r + 0.28));
    g.add(labelBand(tex.wrap, spec.material, c.r, d.w, d.h, c.bandY, -(lc.front - 0.5) * len));
  } else {
    if (tex.front) { const d = partDims(spec, 'front'); g.add(labelBand(tex.front, spec.material, c.r, d.w, d.h, c.bandY, 0)); }
    if (tex.back) { const d = partDims(spec, 'back'); g.add(labelBand(tex.back, spec.material, c.r, d.w, d.h, c.bandY + (c.bandH - d.h) / 2, Math.PI)); }
  }
  if (spec.neck && c.neck && tex.neck) {
    const d = partDims(spec, 'neck');
    g.add(labelBand(tex.neck, spec.material, c.neck.r, d.w, d.h, c.neck.y, 0));
  }
  // nắp / phụ kiện
  const cc = capColor(spec);
  const add = (o3: THREE.Object3D, y: number) => { o3.position.y = y * S; g.add(o3); return o3; };
  let capTop = 0;
  switch (spec.container) {
    case 'pet500': {
      add(ridgedCap(15.6, 18, cc.color, cc.metal, cc.rough, 48), 197); capTop = 215.6;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(15.4 * S, 0.9 * S, 10, 64), new THREE.MeshPhysicalMaterial({ color: cc.color, roughness: 0.35 }));
      ring.rotation.x = Math.PI / 2; add(ring, 194.5);
      break;
    }
    case 'glass250': add(ridgedCap(14.6, 16, cc.color, cc.metal, cc.rough), 150); capTop = 166.6; break;
    case 'glass500': add(ridgedCap(16.2, 18, cc.color, cc.metal, cc.rough), 206); capTop = 224.6; break;
    case 'jar500': add(ridgedCap(36.8, 16, cc.color, cc.metal, cc.rough, 120), 83.5); capTop = 100.1; break;
    case 'jarpl': add(ridgedCap(35.6, 20, cc.color, cc.metal, cc.rough, 90), 54); capTop = 74.6; break;
    case 'wine750': {
      const p = lbPalette(spec.palette);
      const foil = new THREE.MeshPhysicalMaterial({ color: p.id === 'navy' ? '#B8923C' : '#6E1420', metalness: 0.75, roughness: 0.34, clearcoat: 0.6, side: THREE.DoubleSide });
      const cap = new THREE.Mesh(new THREE.LatheGeometry(v2([[15.3, 262], [15.6, 297], [15.4, 299.6], [14.2, 300.6], [0, 300.6]]), 96), foil);
      cap.castShadow = true; g.add(cap);
      break;
    }
    case 'dropper30': {
      add(ridgedCap(10.6, 11, '#C9A24A', 0.95, 0.28, 40), 64);
      const bulb = new THREE.Mesh(new THREE.LatheGeometry(new THREE.SplineCurve(v2([[0.01, 75], [7.6, 75.2], [7.9, 79], [7.6, 87], [6.6, 93.5], [4.4, 97.8], [0, 99.6]])).getPoints(40), 96),
        new THREE.MeshPhysicalMaterial({ color: '#151515', roughness: 0.55, clearcoat: 0.2 }));
      bulb.castShadow = true; g.add(bulb);
      const pip = new THREE.Mesh(new THREE.CylinderGeometry(3 * S, 2.2 * S, 56 * S, 24, 1, true), glassMat('clear'));
      pip.position.y = 38 * S; pip.renderOrder = 2; g.add(pip);
      break;
    }
    case 'can330': {
      const lid = new THREE.Mesh(new THREE.CircleGeometry(27.6 * S, 64), new THREE.MeshPhysicalMaterial({ color: '#C3C8CF', metalness: 1, roughness: 0.3 }));
      lid.rotation.x = -Math.PI / 2; lid.position.y = 120.4 * S; g.add(lid);
      // khoen kéo: tấm nhôm bo tròn có lỗ, nằm phẳng trên nắp
      const ts = new THREE.Shape(); const tw2 = 5.5, th2 = 10;
      ts.absarc(0, th2 - tw2, tw2, 0, Math.PI, false); ts.lineTo(-tw2, -th2 + tw2); ts.absarc(0, -th2 + tw2, tw2, Math.PI, Math.PI * 2, false); ts.lineTo(tw2, th2 - tw2);
      const hole = new THREE.Path(); hole.absellipse(0, -th2 + tw2 + 0.5, 3, 3.6, 0, Math.PI * 2, true); ts.holes.push(hole);
      const tab = new THREE.Mesh(new THREE.ExtrudeGeometry(ts, { depth: 0.5, bevelEnabled: true, bevelSize: 0.25, bevelThickness: 0.2, bevelSegments: 2, curveSegments: 24 }).scale(S, S, S),
        new THREE.MeshPhysicalMaterial({ color: '#B9BEC6', metalness: 1, roughness: 0.22 }));
      tab.rotation.x = -Math.PI / 2; tab.position.set(0, 120.5 * S, 2 * S); tab.castShadow = true; g.add(tab);
      const mouth = new THREE.Mesh(new THREE.CapsuleGeometry(4 * S, 6 * S, 6, 16), new THREE.MeshStandardMaterial({ color: '#2A2D33', roughness: 0.6 }));
      mouth.rotation.x = -Math.PI / 2; mouth.scale.set(1, 1, 0.05); mouth.position.set(0, 120.6 * S, 15 * S); g.add(mouth);
      break;
    }
  }
  if (spec.cap && c.cap && tex.cap && capTop) {
    const d = partDims(spec, 'cap');
    const disc = new THREE.Mesh(new THREE.CircleGeometry((d.w / 2) * S, 96), labelMat(tex.cap, spec.material));
    disc.rotation.x = -Math.PI / 2; disc.position.y = (capTop + 0.15) * S; disc.renderOrder = 2;
    g.add(disc);
  }
  return g;
}

export function labelBuilder(o: Label3DOpts): Builder {
  return async (aniso) => {
    const { spec } = o;
    const c = lbContainer(spec.container);
    const bg = ''; // nền trong suốt: góc bo của nhãn không bị ô trắng
    const mk = async (el: SVGSVGElement | null, wMm: number) => {
      if (!el) return null;
      const t = await svgTex(el, o.fontCss, Math.min(4096, Math.max(1024, Math.round(wMm * 14))), aniso, bg);
      t.anisotropy = aniso; return t;
    };
    const tex: Record<string, THREE.Texture | null> = {
      wrap: spec.style === 'wrap' ? await mk(o.wrap, partDims(spec, 'wrap').w) : null,
      front: spec.style === 'frontback' ? await mk(o.front, partDims(spec, 'front').w) : null,
      back: spec.style === 'frontback' ? await mk(o.back, partDims(spec, 'back').w) : null,
      cap: spec.cap && c.cap ? await mk(o.cap, partDims(spec, 'cap').w) : null,
      neck: spec.neck && c.neck ? await mk(o.neck, partDims(spec, 'neck').w) : null,
    };
    if (!tex.wrap && !tex.front) throw new Error('Chưa dựng xong nhãn');
    const VIEW_AZ = 0.3;
    const root = new THREE.Group();
    const main = await item(o, tex, aniso);
    const second = await item(o, tex, aniso);
    // món chính: mặt trước nhìn thẳng máy ảnh; món sau: quay vùng thông tin (nhãn quấn) / nhãn sau
    main.rotation.y = VIEW_AZ;
    if (spec.style === 'wrap') {
      const lc = wrapCenters(spec), d = partDims(spec, 'wrap');
      const len = Math.min(Math.PI * 2 * 0.999, d.w / (c.r + 0.28));
      second.rotation.y = VIEW_AZ - (lc.info - lc.front) * len + 0.1;
    } else second.rotation.y = VIEW_AZ - Math.PI + 0.1;
    const tall = SHAPES[spec.container].pts.at(-1)![1];
    const sp = c.r * 2.35 + Math.max(0, 40 - c.r) * 0.6;
    second.position.set(-sp * S, 0, -c.r * 1.25 * S);
    root.add(second, main);
    const zoom = tall > 200 ? 1.12 : tall < 110 ? 1.28 : 1.2;
    return { group: root, view: { az: VIEW_AZ, el: tall < 110 ? 0.3 : 0.16 }, aim: 0.46, zoom, blob: 0.45 };
  };
}
