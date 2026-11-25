'use client';
// Túi zip đứng 3D (doypack): 2 mặt màng ghép phồng thật (lưới nhiều đỉnh: mép hàn 2 bên + mép trên phẳng, bụng căng,
// đáy gusset bầu dục để túi tự đứng), gờ khoá zip, vân dập mép hàn, lỗ treo + vết xé cắt thật (alpha).
// Chất liệu: màng bạc ánh kim / trắng bóng / mờ / kraft / màng trong. Cửa sổ trong → nhìn thấy hạt bên trong
// (InstancedMesh: hạt cà phê, hạt điều, trà, kẹo, bột, hạt thú cưng). Cặp túi: 1 mặt trước + 1 xoay khoe mặt sau.

import * as THREE from 'three';
import { S, svgTex, type Builder } from './mockup3d';
import { holePaths, pcPalette, pouchGeom, windowPath, type PCData, type PCGeom, type PCIndustry, type PCSpec } from './pouch-engine';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (t: number) => { const x = clamp01(t); return x * x * (3 - 2 * x); };

/** nửa độ dày túi (mm) tại (x, y): x ∈ [-W/2, W/2], y từ đáy lên */
function makeSurface(g: PCGeom) {
  const { W, H, G, seal } = g;
  const yz = H - g.zipY;                 // cao độ khoá zip
  const hw = W / 2 - seal;
  const A0 = G / 2;
  const s0 = yz * 0.5, s1 = yz - 2;      // vai túi: từ bụng phồng → phẳng ở khoá zip
  const amp = (y: number) => {
    const f = y <= s0 ? 1 : y >= s1 ? 0 : 1 - smooth((y - s0) / (s1 - s0));
    return A0 * (1 + 0.38 * Math.sin(Math.PI * clamp01(y / (yz * 0.8)))) * Math.pow(f, 0.8);
  };
  const z = (x: number, y: number) => {
    const tx = Math.abs(x) / hw;
    const bul = tx >= 1 ? 0 : Math.pow(1 - Math.pow(tx, 2), 0.62);
    const ell = Math.sqrt(Math.max(0, 1 - (x / (W / 2)) ** 2));
    const bl = smooth(y / (G * 0.95));
    return amp(y) * (ell * (1 - bl) + bul * bl);
  };
  return { z, amp, yz, hw, A0, s0 };
}

function faceGeometry(g: PCGeom, front: boolean): THREE.BufferGeometry {
  const { W, H } = g;
  const sf = makeSurface(g);
  const geo = new THREE.PlaneGeometry(W, H, 110, 170);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = g.valve && front ? { x: g.valve.cx - W / 2, y: H - g.valve.cy, r: g.valve.r } : null;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i) + H / 2;
    const bl = smooth(y / (g.G * 1.8));
    const A = sf.amp(y) / sf.A0;
    let zz = sf.z(x, y);
    const inner = 1 - smooth((Math.abs(x) - sf.hw + 2) / 3);
    // gờ khoá zip (2 rãnh) + nếp nhăn nhẹ ở vai túi
    zz += (0.9 * Math.exp(-(((y - sf.yz) / 1.2) ** 2)) + 0.55 * Math.exp(-(((y - sf.yz + 3.2) / 0.9) ** 2))) * inner;
    const shoulder = smooth((y - sf.s0 * 0.9) / (sf.yz * 0.2)) * (1 - smooth((y - sf.yz + 5) / 4));
    zz += shoulder * inner * 0.4 * Math.sin(x / 7.5 + y / 11);
    if (v) { const d = Math.hypot(x - v.x, y - v.y) / v.r; if (d < 1) zz += 0.9 * (1 - d * d); }
    // túi căng → 2 mép hàn hơi thắt vào ở bụng
    const xs = x * (1 - 0.04 * Math.min(1, A) * bl);
    pos.setXYZ(i, xs, y, Math.max(0.18, zz));
  }
  geo.computeVertexNormals();
  return geo;
}

// ---------- texture phụ ----------
function canvasOf(w: number, h: number) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function linTex(c: HTMLCanvasElement) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t; }

/** alpha của bản in → mask xám (trắng = có màng in) */
function alphaOf(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = canvasOf(src.width, src.height), x = c.getContext('2d')!;
  const t = canvasOf(src.width, src.height), tx = t.getContext('2d')!;
  tx.drawImage(src, 0, 0); tx.globalCompositeOperation = 'source-in'; tx.fillStyle = '#fff'; tx.fillRect(0, 0, t.width, t.height);
  x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height); x.drawImage(t, 0, 0);
  return c;
}
/** lớp phim bóng chỉ phủ vùng trong suốt (cửa sổ / màng trong), trừ lỗ bế */
function filmOf(alpha: HTMLCanvasElement, g: PCGeom): HTMLCanvasElement {
  const c = canvasOf(alpha.width, alpha.height), x = c.getContext('2d')!;
  const a = alpha.getContext('2d')!.getImageData(0, 0, c.width, c.height);
  const out = x.createImageData(c.width, c.height);
  for (let i = 0; i < a.data.length; i += 4) { const v = a.data[i] < 128 ? 255 : 0; out.data[i] = out.data[i + 1] = out.data[i + 2] = v; out.data[i + 3] = 255; }
  x.putImageData(out, 0, 0);
  const k = c.width / g.W;
  x.setTransform(k, 0, 0, k, 0, 0); x.fillStyle = '#000';
  for (const d of holePaths(g)) x.fill(new Path2D(d));
  return c;
}
/** vân dập mép hàn (kẻ chéo) + thớ giấy kraft */
function bumpOf(g: PCGeom, kraft: boolean): HTMLCanvasElement {
  const k = 5, c = canvasOf(Math.round(g.W * k), Math.round(g.H * k)), x = c.getContext('2d')!;
  x.fillStyle = 'rgb(128,128,128)'; x.fillRect(0, 0, c.width, c.height);
  if (kraft) {
    let seed = 3; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < c.width * c.height * 0.02; i++) { const v = 100 + rnd() * 56; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(rnd() * c.width, rnd() * c.height, 1 + rnd() * 4, 1); }
  }
  x.save();
  x.beginPath();
  x.rect(0, 0, g.seal * k, c.height); x.rect(c.width - g.seal * k, 0, g.seal * k, c.height); x.rect(0, 0, c.width, g.topSeal * k);
  x.clip();
  x.lineWidth = k * 0.35;
  for (let i = -c.height; i < c.width + c.height; i += k * 1.1) {
    x.strokeStyle = 'rgb(175,175,175)'; x.beginPath(); x.moveTo(i, 0); x.lineTo(i + c.height, c.height); x.stroke();
    x.strokeStyle = 'rgb(90,90,90)'; x.beginPath(); x.moveTo(i, c.height); x.lineTo(i + c.height, 0); x.stroke();
  }
  x.restore();
  return c;
}

// ---------- hạt bên trong ----------
interface Grain { geo: THREE.BufferGeometry; mat: THREE.Material; sp: number; ext: number; colors?: string[] }
function grainOf(ind: PCIndustry): Grain {
  switch (ind) {
    case 'coffee': {
      const geo = new THREE.SphereGeometry(1, 16, 12);
      const p = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const groove = z > 0 && Math.abs(x - 0.16 * Math.sin(y * 2.6)) < 0.14 ? 0.62 : 1;
        p.setXYZ(i, x * 3.4, y * 5, z * 2.5 * groove);
      }
      geo.computeVertexNormals();
      return { geo, mat: new THREE.MeshPhysicalMaterial({ color: '#4A2A18', roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.4 }), sp: 8.5, ext: 5.2, colors: ['#4A2A18', '#5A3420', '#3E2214'] };
    }
    case 'nuts': {
      const geo = new THREE.TorusGeometry(4.4, 2.5, 10, 18, 2.5); geo.rotateZ(-1.25);
      return { geo, mat: new THREE.MeshStandardMaterial({ color: '#E6C78C', roughness: 0.62 }), sp: 11, ext: 7, colors: ['#E6C78C', '#DDB877', '#EFD39F'] };
    }
    case 'tea': {
      const geo = new THREE.IcosahedronGeometry(1, 1);
      const p = geo.attributes.position as THREE.BufferAttribute;
      let s = 5; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 - 0.5; };
      for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (3.2 + rnd()), p.getY(i) * (1.3 + rnd() * 0.6), p.getZ(i) * (2 + rnd()));
      geo.computeVertexNormals();
      return { geo, mat: new THREE.MeshStandardMaterial({ color: '#3F5B2B', roughness: 0.85 }), sp: 6, ext: 3.6, colors: ['#3F5B2B', '#4E6B33', '#34481F'] };
    }
    case 'candy': {
      const geo = new THREE.SphereGeometry(1, 16, 12); geo.scale(5.2, 4, 4);
      return { geo, mat: new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.1 }), sp: 11, ext: 5.3, colors: ['#E0336F', '#F59E0B', '#7C3AED', '#10B981', '#EF4444'] };
    }
    case 'cosmetic': {
      const geo = new THREE.IcosahedronGeometry(1.7, 0);
      return { geo, mat: new THREE.MeshStandardMaterial({ color: '#E9D6B0', roughness: 0.95 }), sp: 3.2, ext: 1.8, colors: ['#E9D6B0', '#E3C99A', '#EEDFC0'] };
    }
    default: {
      const geo = new THREE.CylinderGeometry(4.2, 4.2, 3.2, 14);
      return { geo, mat: new THREE.MeshStandardMaterial({ color: '#8B5A2B', roughness: 0.78 }), sp: 9.5, ext: 4.4, colors: ['#8B5A2B', '#7A4B22', '#9C6A36'] };
    }
  }
}

function fillContents(g: PCGeom, gr: Grain, both: boolean, spill: boolean): THREE.InstancedMesh {
  const sf = makeSurface(g);
  const yf = sf.yz * 0.72;
  const pts: [number, number, number][] = [];
  let seed = 11; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 - 0.5; };
  const r = gr.sp * 0.5;
  let sp = gr.sp;
  // ước lượng số hạt, quá nhiều (bột mịn) thì nới khoảng cách
  const est = ((sf.hw * 2) * yf) / (sp * sp) * (both ? 4 : 3);
  if (est > 9000) sp *= Math.sqrt(est / 9000);
  const k = sp / gr.sp, ext = gr.ext * k * 1.15; // nửa kích thước lớn nhất của 1 hạt (đã tính xoay ngẫu nhiên)
  // hạt phải nằm TRONG màng: lùi khỏi mặt túi đúng bằng ext, x co theo độ thắt mép túi
  const xin = (x: number, y: number) => x * (1 - 0.04 * Math.min(1, sf.amp(y) / sf.A0) * smooth(y / (g.G * 1.8)));
  const push = (x: number, y: number, zr: number) => {
    const zf = sf.z(x, y) - 0.4 - ext;
    if (zf < 0 || Math.abs(x) > sf.hw - ext) return;
    pts.push([xin(x, y), y, Math.max(-zf, Math.min(zf, zr * zf))]);
  };
  for (let y = ext; y < yf; y += sp * 0.86) {
    for (let x = -sf.hw + ext; x < sf.hw - ext; x += sp) {
      const xx = x + rnd() * sp * 0.6, yy = y + rnd() * sp * 0.5;
      push(xx, yy, 1);
      push(xx + sp * 0.5 + rnd() * sp * 0.3, yy + sp * 0.4 + rnd() * sp * 0.3, 0.6); // lớp 2 lấp khe giữa các hạt
      push(xx + rnd() * sp, yy + rnd() * sp * 0.5, rnd() * 1.6);
      if (both) push(xx, yy, -1);
    }
  }
  // mặt trên đống hạt
  for (let x = -sf.hw + ext; x < sf.hw - ext; x += sp * 0.9) {
    for (let t = -1; t <= 1; t += (sp * 0.9) / Math.max(sp, sf.z(x, yf))) push(x + rnd() * sp * 0.5, yf + rnd() * sp * 0.6, t);
  }
  const extra: [number, number, number][] = [];
  if (spill) for (let i = 0; i < 14; i++) extra.push([(rnd() * 1.1) * g.W * 0.7, -1, g.G * 0.55 + (rnd() + 0.5) * g.W * 0.3]);
  const n = pts.length + extra.length;
  const m = new THREE.InstancedMesh(gr.geo, gr.mat, n);
  const q = new THREE.Quaternion(), e = new THREE.Euler(), mt = new THREE.Matrix4(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  const col = new THREE.Color();
  let i = 0;
  for (const [x, y, z] of pts) {
    e.set(rnd() * 6, rnd() * 6, rnd() * 6); q.setFromEuler(e);
    const s = (sp / gr.sp) * (0.85 + rnd() * 0.3); sc.set(s, s, s);
    mt.compose(p.set(x, y, z), q, sc); m.setMatrixAt(i, mt);
    if (gr.colors) m.setColorAt(i, col.set(gr.colors[i % gr.colors.length]));
    i++;
  }
  for (const [x, , z] of extra) {
    // hạt rơi trên mặt bàn: nằm phẳng
    e.set(Math.PI / 2 + rnd() * 0.3, rnd() * 6, rnd() * 0.3); q.setFromEuler(e);
    const s = 0.95 + rnd() * 0.2; sc.set(s, s, s);
    mt.compose(p.set(x, gr.sp * 0.22, z), q, sc); m.setMatrixAt(i, mt);
    if (gr.colors) m.setColorAt(i, col.set(gr.colors[i % gr.colors.length]));
    i++;
  }
  m.castShadow = true; m.receiveShadow = false;
  return m;
}

// ---------- vật liệu theo chất liệu ----------
function printMat(spec: PCSpec, map: THREE.Texture, bump: THREE.Texture): THREE.MeshPhysicalMaterial {
  const base = { map, alphaTest: 0.5, bumpMap: bump, bumpScale: spec.material === 'kraft' ? 1.6 : 1.1 };
  switch (spec.material) {
    case 'foil': return new THREE.MeshPhysicalMaterial({ ...base, metalness: 0.22, roughness: 0.34, clearcoat: 0.32, clearcoatRoughness: 0.38, iridescence: 0.08 }); // clearcoat nhám hơn: bóng loá dịu, không loá đè tiêu đề
    case 'white': return new THREE.MeshPhysicalMaterial({ ...base, metalness: 0, roughness: 0.36, clearcoat: 0.6, clearcoatRoughness: 0.18 });
    case 'matte': return new THREE.MeshPhysicalMaterial({ ...base, metalness: 0, roughness: 0.66, sheen: 0.3, sheenRoughness: 0.8 });
    case 'kraft': return new THREE.MeshPhysicalMaterial({ ...base, metalness: 0, roughness: 0.93 });
    default: return new THREE.MeshPhysicalMaterial({ ...base, metalness: 0, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06 });
  }
}
function innerMat(spec: PCSpec, alpha: THREE.Texture): THREE.MeshStandardMaterial {
  const silver = spec.material === 'foil' || spec.material === 'kraft';
  return new THREE.MeshStandardMaterial({
    color: silver ? '#C3C7CD' : '#D9D6CF', metalness: silver ? 0.85 : 0, roughness: silver ? 0.32 : 0.6,
    side: THREE.BackSide, alphaMap: alpha, alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  });
}
function filmMat(alpha: THREE.Texture, clear: boolean): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: '#FFFFFF', transparent: true, opacity: clear ? 0.2 : 0.12, alphaMap: alpha, roughness: 0.05, metalness: 0, side: clear ? THREE.DoubleSide : THREE.FrontSide,
    clearcoat: 1, clearcoatRoughness: 0.03, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
}

interface Faces { front: THREE.Texture; back: THREE.Texture; fa: THREE.Texture; ba: THREE.Texture; ff: THREE.Texture; bf: THREE.Texture; bump: THREE.Texture }

function makePouch(g: PCGeom, spec: PCSpec, t: Faces, contents: THREE.InstancedMesh | null): THREE.Group {
  const grp = new THREE.Group();
  const clear = spec.material === 'clear';
  const gf = faceGeometry(g, true), gb = faceGeometry(g, false);
  gb.rotateY(Math.PI); // mặt sau: lật 180° → pháp tuyến hướng −z, chữ đọc xuôi khi nhìn từ sau
  const add = (geo: THREE.BufferGeometry, map: THREE.Texture, alpha: THREE.Texture, film: THREE.Texture) => {
    const outer = new THREE.Mesh(geo, printMat(spec, map, t.bump)); outer.castShadow = true;
    const inner = new THREE.Mesh(geo, innerMat(spec, alpha));
    const f = new THREE.Mesh(geo, filmMat(film, clear)); f.renderOrder = 3;
    grp.add(outer, inner, f);
  };
  add(gf, t.front, t.fa, t.ff);
  add(gb, t.back, t.ba, t.bf);
  // đáy bầu dục
  const sf = makeSurface(g);
  const sh = new THREE.Shape(); sh.absellipse(0, 0, g.W / 2 - 0.5, sf.A0 - 0.3, 0, Math.PI * 2, false, 0);
  const bottom = new THREE.Mesh(new THREE.ShapeGeometry(sh, 40), new THREE.MeshStandardMaterial({ color: clear ? '#EDEDED' : pcPalette(spec.palette).bg2, roughness: 0.6, side: THREE.DoubleSide, transparent: clear, opacity: clear ? 0.35 : 1 }));
  bottom.rotation.x = -Math.PI / 2; bottom.position.y = 0.25;
  grp.add(bottom);
  if (clear) {
    // túi trong: thấy rõ 2 ray khoá zip nhựa trắng đục
    const zm = new THREE.MeshPhysicalMaterial({ color: '#F4F6F8', transparent: true, opacity: 0.85, roughness: 0.35, clearcoat: 0.6 });
    for (const zs of [1, -1]) for (const dy of [0, -3.2]) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, (g.W / 2 - g.seal) * 2, 10), zm);
      rail.rotation.z = Math.PI / 2; rail.position.set(0, sf.yz + dy, zs * 0.9);
      grp.add(rail);
    }
  }
  if (contents) grp.add(contents);
  return grp;
}

export function pouchBuilder(o: { front: SVGSVGElement | null; back: SVGSVGElement | null; spec: PCSpec; data: PCData; fontCss: string; pair?: boolean }): Builder {
  return async (aniso) => {
    if (!o.front || !o.back) throw new Error('Chưa dựng xong túi');
    const spec = o.spec;
    const g = pouchGeom(spec);
    const res = Math.min(2048, Math.round(g.W * 9));
    const [front, back] = await Promise.all([svgTex(o.front, o.fontCss, res, aniso, ''), svgTex(o.back, o.fontCss, res, aniso, '')]);
    const fa = alphaOf(front.image as HTMLCanvasElement), ba = alphaOf(back.image as HTMLCanvasElement);
    const t: Faces = {
      front, back, fa: linTex(fa), ba: linTex(ba), ff: linTex(filmOf(fa, g)), bf: linTex(filmOf(ba, g)),
      bump: linTex(bumpOf(g, spec.material === 'kraft')),
    };
    const clear = spec.material === 'clear';
    const seeInside = clear || !!windowPath(spec, o.data);
    const gr = grainOf(spec.industry);
    const pair = o.pair ?? true;

    const root = new THREE.Group();
    const p1 = makePouch(g, spec, t, seeInside ? fillContents(g, gr, clear, false) : null);
    p1.rotation.y = 0.12;
    root.add(p1);
    if (pair) {
      const p2 = makePouch(g, spec, t, clear ? fillContents(g, gr, true, false) : null);
      p2.rotation.y = Math.PI - 0.42;
      p2.position.set(g.W * 1.08, 0, -g.W * 0.55);
      root.add(p2);
    }
    if (spec.industry !== 'cosmetic') {
      const spill = fillContents(g, gr, false, true);
      // chỉ giữ hạt rơi (phần cuối) — đặt lại count để bỏ hạt trong túi
      const keep = 14, total = spill.count;
      const mt = new THREE.Matrix4(), col = new THREE.Color();
      for (let i = 0; i < keep; i++) {
        spill.getMatrixAt(total - keep + i, mt); spill.setMatrixAt(i, mt);
        if (spill.instanceColor) { spill.getColorAt(total - keep + i, col); spill.setColorAt(i, col); }
      }
      spill.count = keep;
      spill.position.set(-g.W * 0.1, 0, g.G * 0.1);
      root.add(spill);
    }
    root.scale.setScalar(S);
    const out = new THREE.Group(); out.add(root);
    const bb = new THREE.Box3().setFromObject(out);
    const c = bb.getCenter(new THREE.Vector3());
    root.position.x -= c.x; root.position.z -= c.z;
    return { group: out, view: { az: -0.12, el: 0.15 }, aim: 0.46, zoom: 1.3, blob: 0.5 };
  };
}
