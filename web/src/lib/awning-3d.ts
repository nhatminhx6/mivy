'use client';
// Mái hiên 3D: mặt tiền quán (tường, cửa kính khung nhôm, vỉa hè) + mái hiên đúng loại:
// - tay quay: hộp cuốn trên tường, 2 tay gấp, mái dốc 15° võng nhẹ giữa 2 tay, thanh trước, diềm đung đưa.
// - vòm 1/4: sườn ống uốn cung, vải ôm khung võng nhẹ giữa sườn, 2 hông 1/4 tròn.
// - kiểu Pháp: mái dốc 35° + 2 hông tam giác + khung viền.
// Vải = chính thiết kế (mảnh mái/diềm/hông từ engine). Tường/cửa/vỉa hè không tính vào khung hình (bbox rỗng).

import * as THREE from 'three';
import { S, svgTex, type Builder } from './mockup3d';
import type { AWKind } from './awning-engine';

export interface Awning3DOpts {
  canopy: SVGSVGElement | null; valance: SVGSVGElement | null; side: SVGSVGElement | null;
  fontCss: string;
  kind: AWKind; W: number; proj: number; L: number; drop: number; valH: number;
  sideKind: 'none' | 'tri' | 'quarter';
  frame: string;   // màu khung kim loại
}

const noBounds = <T extends THREE.Object3D>(o: T): T => {
  o.traverse((n) => { const m = n as THREE.Mesh; if (m.geometry) { m.geometry.boundingBox = new THREE.Box3(); m.frustumCulled = false; } });
  return o;
};
const rnd = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

// vân dệt bạt (bump) — lặp
let weaveCanvas: HTMLCanvasElement | null = null;
function weaveTex(aniso: number, rep: number): THREE.Texture {
  if (!weaveCanvas) {
    const N = 256; const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d')!;
    const r = rnd(11);
    x.fillStyle = '#808080'; x.fillRect(0, 0, N, N);
    for (let i = 0; i < N; i += 4) {
      x.fillStyle = `rgba(255,255,255,${0.10 + r() * 0.08})`; x.fillRect(i, 0, 2, N);
      x.fillStyle = `rgba(0,0,0,${0.10 + r() * 0.08})`; x.fillRect(0, i, N, 2);
    }
    for (let k = 0; k < 1800; k++) { x.fillStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},0.05)`; x.fillRect(r() * N, r() * N, 2, 2); }
    weaveCanvas = c;
  }
  const t = new THREE.CanvasTexture(weaveCanvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep * 0.6); t.anisotropy = aniso;
  return t;
}

// tường trát sơn: màu + bump loang
function plasterTex(base: string, aniso: number): { map: THREE.Texture; bump: THREE.Texture } {
  const N = 512; const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d')!;
  const b = document.createElement('canvas'); b.width = b.height = N; const y = b.getContext('2d')!;
  const r = rnd(5);
  x.fillStyle = base; x.fillRect(0, 0, N, N); y.fillStyle = '#808080'; y.fillRect(0, 0, N, N);
  for (let i = 0; i < 2600; i++) {
    const px = r() * N, py = r() * N, s = 1 + r() * 3, k = r();
    x.fillStyle = k > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'; x.fillRect(px, py, s, s);
    y.fillStyle = k > 0.5 ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'; y.fillRect(px, py, s, s);
  }
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
  const bump = new THREE.CanvasTexture(b);
  for (const t of [map, bump]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso; }
  return { map, bump };
}
// vỉa hè gạch vuông 400mm
function pavingTex(aniso: number): THREE.Texture {
  const N = 512; const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d')!;
  const r = rnd(3); const n = 4, t = N / n;
  x.fillStyle = '#8F8A82'; x.fillRect(0, 0, N, N);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const k = 0.92 + r() * 0.12;
    x.fillStyle = `rgb(${Math.round(196 * k)},${Math.round(190 * k)},${Math.round(180 * k)})`;
    x.fillRect(i * t + 3, j * t + 3, t - 6, t - 6);
  }
  for (let k = 0; k < 3000; k++) { x.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.04})`; x.fillRect(r() * N, r() * N, 2, 2); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = aniso;
  return tex;
}
// trong quán: ánh đèn ấm loang từ trên xuống + bóng kệ
function interiorTex(): THREE.Texture {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#6B5A45'); g.addColorStop(0.55, '#3E352C'); g.addColorStop(1, '#2A241F');
  x.fillStyle = g; x.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 4; i++) { const rg = x.createRadialGradient(64 + i * 128, 30, 4, 64 + i * 128, 40, 110); rg.addColorStop(0, 'rgba(255,214,150,0.55)'); rg.addColorStop(1, 'rgba(255,214,150,0)'); x.fillStyle = rg; x.fillRect(0, 0, 512, 256); }
  x.fillStyle = 'rgba(20,16,12,0.55)';
  for (let i = 0; i < 3; i++) x.fillRect(30, 90 + i * 45, 170, 6);
  for (let i = 0; i < 3; i++) x.fillRect(312, 90 + i * 45, 170, 6);
  x.fillStyle = 'rgba(25,20,15,0.7)'; x.fillRect(200, 170, 112, 86);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const rod = (a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material) => {
  const d = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 14), mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  m.castShadow = true;
  return m;
};

// lưới mặt cong tham số (u ngang 0..1, v 0..1) → uv (u, 1-v)
function surface(nu: number, nv: number, fn: (u: number, v: number) => THREE.Vector3): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const u = i / nu, v = j / nv; const p = fn(u, v);
    pos.push(p.x, p.y, p.z); uv.push(u, 1 - v);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

export function awningBuilder(o: Awning3DOpts): Builder {
  return async (aniso) => {
    if (!o.canopy || !o.valance) throw new Error('Chưa dựng xong mái hiên');
    const { W, proj, L, drop, valH, kind } = o;
    const px = (mm: number) => Math.max(512, Math.min(4096, Math.round(mm)));
    const [tC, tV, tS] = await Promise.all([
      svgTex(o.canopy, o.fontCss, px(W * 0.75), aniso),
      svgTex(o.valance, o.fontCss, px(W * 0.75), aniso, ''),
      o.side && o.sideKind !== 'none' ? svgTex(o.side, o.fontCss, px(Math.max(proj, drop) * 1.2), aniso, '') : Promise.resolve(null),
    ]);
    const bump = weaveTex(aniso, Math.max(4, W / 160));
    const fabric = (map: THREE.Texture, alpha = false) => new THREE.MeshPhysicalMaterial({
      map, bumpMap: bump, bumpScale: 0.6, roughness: 0.82, sheen: 0.25, sheenRoughness: 0.7, side: THREE.DoubleSide,
      ...(alpha ? { transparent: true, alphaTest: 0.5 } : {}),
    });
    const metal = new THREE.MeshStandardMaterial({ color: o.frame, metalness: 0.75, roughness: 0.35 });

    const inner = new THREE.Group();
    inner.scale.setScalar(S);
    const out = new THREE.Group(); out.add(inner);

    // độ cao gắn: mép dưới diềm luôn ≥ 2.1m cho người đi qua
    const h0 = Math.max(2750, 2150 + (kind === 'dome' ? proj : drop) + valH);
    const wallW = W + 9000, wallH = h0 + 3200;

    // ---------- mặt tiền (không tính khung hình) ----------
    const deco = new THREE.Group();
    const pl = plasterTex('#E6DFD3', aniso);
    // tường có khoét ô cửa (cửa kính lùi vào trong)
    const openW = Math.min(W * 0.86, W - 300), openH = Math.min(2500, h0 - 250);
    const ws = new THREE.Shape([new THREE.Vector2(-wallW / 2, 0), new THREE.Vector2(wallW / 2, 0), new THREE.Vector2(wallW / 2, wallH), new THREE.Vector2(-wallW / 2, wallH)]);
    ws.holes.push(new THREE.Path([new THREE.Vector2(-openW / 2, 140), new THREE.Vector2(-openW / 2, 140 + openH), new THREE.Vector2(openW / 2, 140 + openH), new THREE.Vector2(openW / 2, 140)]));
    const wg = new THREE.ShapeGeometry(ws);
    pl.map.repeat.set(1 / 1400, 1 / 1400); pl.bump.repeat.set(1 / 1400, 1 / 1400);
    const wall = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ map: pl.map, bumpMap: pl.bump, bumpScale: 0.5, roughness: 0.95 }));
    wall.position.z = -2; wall.receiveShadow = true;
    deco.add(wall);
    // má cửa (độ dày tường) quanh ô khoét
    const jamb = new THREE.MeshStandardMaterial({ color: '#D9D1C3', roughness: 0.95 });
    const jb = (x: number, y: number, w: number, h: number) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 200), jamb); m.position.set(x, y, -100); m.receiveShadow = true; deco.add(m); };
    jb(-openW / 2 - 15, 140 + openH / 2, 30, openH); jb(openW / 2 + 15, 140 + openH / 2, 30, openH); jb(0, 140 + openH + 15, openW + 60, 30);
    // dải phào dưới mái + chân tường
    const trim = new THREE.MeshStandardMaterial({ color: '#CFC6B6', roughness: 0.9 });
    const skirting = new THREE.Mesh(new THREE.BoxGeometry(wallW, 140, 30), trim); skirting.position.set(0, 70, 10); skirting.receiveShadow = true; deco.add(skirting);
    // ô cửa kính khung nhôm
    const it = interiorTex();
    const interior = new THREE.Mesh(new THREE.PlaneGeometry(openW, openH), new THREE.MeshBasicMaterial({ map: it, color: new THREE.Color(0.85, 0.85, 0.85) }));
    interior.position.set(0, openH / 2 + 140, -180); deco.add(interior);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(openW, openH), new THREE.MeshPhysicalMaterial({ color: '#B9C7CF', roughness: 0.06, metalness: 0, transparent: true, opacity: 0.22, clearcoat: 1, clearcoatRoughness: 0.05 }));
    glass.position.set(0, openH / 2 + 140, -60); deco.add(glass);
    const alu = new THREE.MeshStandardMaterial({ color: '#30353B', metalness: 0.6, roughness: 0.4 });
    const fb = (x: number, y: number, w: number, h: number) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 70), alu); m.position.set(x, y, -40); m.castShadow = true; m.receiveShadow = true; deco.add(m); };
    fb(0, 140 + openH, openW + 120, 60); fb(0, 140, openW + 120, 50);
    fb(-openW / 2 - 30, 140 + openH / 2, 60, openH); fb(openW / 2 + 30, 140 + openH / 2, 60, openH);
    const nMull = Math.max(2, Math.round(openW / 1100));
    for (let i = 1; i < nMull; i++) fb(-openW / 2 + (openW * i) / nMull, 140 + openH / 2, 40, openH);
    fb(0, 140 + openH * 0.82, openW, 30);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 900, 12), new THREE.MeshStandardMaterial({ color: '#C9CDD3', metalness: 0.9, roughness: 0.25 }));
    handle.position.set(-openW / (2 * nMull) * 0.25, 1150, 10); deco.add(handle);
    // vỉa hè
    const pv = pavingTex(aniso);
    const pavD = proj + 9000;
    pv.repeat.set(wallW / 1600, pavD / 1600);
    const pave = new THREE.Mesh(new THREE.PlaneGeometry(wallW, pavD), new THREE.MeshStandardMaterial({ map: pv, roughness: 0.92 }));
    pave.rotation.x = -Math.PI / 2; pave.position.set(0, 1, pavD / 2 - 2); pave.receiveShadow = true;
    deco.add(pave);
    inner.add(noBounds(deco));

    // ---------- mái hiên ----------
    const aw = new THREE.Group();
    const cMat = fabric(tC); const vMat = fabric(tV, true);
    let frontY = 0, frontZ = 0;

    if (kind === 'retract' || kind === 'french') {
      const armX = W / 2 - 220;
      const sagAmp = kind === 'retract' ? Math.min(70, proj * 0.025) : 25;
      const canopy = new THREE.Mesh(surface(Math.max(40, Math.round(W / 80)), 22, (u, v) => {
        const x = -W / 2 + u * W;
        const ex = x / (W / 2);
        const sag = sagAmp * Math.sin(Math.PI * v) * (1 - 0.75 * ex * ex) + 5 * Math.sin(x / 95) * Math.sin(Math.PI * v);
        return new THREE.Vector3(x, h0 - v * drop - sag, v * proj);
      }), cMat);
      canopy.castShadow = true; canopy.receiveShadow = true; aw.add(canopy);
      frontY = h0 - drop; frontZ = proj;
      if (kind === 'retract') {
        // hộp cuốn + bát gắn tường
        const cas = new THREE.Mesh(new THREE.BoxGeometry(W + 140, 170, 230), metal);
        cas.position.set(0, h0 + 70, 100); cas.castShadow = true; aw.add(cas);
        const lip = new THREE.Mesh(new THREE.CylinderGeometry(55, 55, W + 120, 24), metal);
        lip.rotation.z = Math.PI / 2; lip.position.set(0, h0 + 5, 175); aw.add(lip);
        // 2 tay gấp: vai trên tường → khuỷu chụm vào trong → tay tới thanh trước
        for (const sgn of [-1, 1]) {
          const sh = new THREE.Vector3(sgn * armX, h0 - 330, 40);
          const hand = new THREE.Vector3(sgn * armX, frontY - 40, proj - 20);
          const el = new THREE.Vector3(sgn * (armX - Math.min(700, W * 0.16)), (sh.y + hand.y) / 2 - 90, proj * 0.52);
          aw.add(rod(sh, el, 26, metal), rod(el, hand, 24, metal));
          const j = new THREE.Mesh(new THREE.CylinderGeometry(42, 42, 70, 18), metal); j.position.copy(el); aw.add(j);
          const br = new THREE.Mesh(new THREE.BoxGeometry(120, 220, 60), metal); br.position.set(sh.x, sh.y, 30); br.castShadow = true; aw.add(br);
        }
      } else {
        // kiểu Pháp: thanh viền trên + 2 thanh xiên hai mép
        aw.add(rod(new THREE.Vector3(-W / 2, h0, 10), new THREE.Vector3(W / 2, h0, 10), 18, metal));
        for (const sgn of [-1, 1]) aw.add(rod(new THREE.Vector3(sgn * W / 2, h0, 10), new THREE.Vector3(sgn * W / 2, frontY, proj), 16, metal));
      }
      // thanh trước
      const bar = new THREE.Mesh(new THREE.BoxGeometry(W + 30, 95, 70), metal);
      bar.position.set(0, frontY - 25, frontZ + 15); bar.castShadow = true; aw.add(bar);
    } else {
      // vòm 1/4: θ 0..90°, tâm cung tại (y=h0-r, z=0)
      const r = proj;
      const nRib = Math.max(3, Math.round(W / 750) + 1);
      const ribSp = W / (nRib - 1);
      const canopy = new THREE.Mesh(surface(Math.max(48, Math.round(W / 60)), 28, (u, v) => {
        const x = -W / 2 + u * W;
        const th = v * Math.PI / 2;
        const fr = ((x + W / 2) / ribSp) % 1;
        const rr = r - 14 * Math.sin(Math.PI * fr) * Math.sin(Math.PI * Math.min(1, v * 1.15));
        return new THREE.Vector3(x, h0 - r + rr * Math.cos(th), rr * Math.sin(th));
      }), cMat);
      canopy.castShadow = true; canopy.receiveShadow = true; aw.add(canopy);
      for (let i = 0; i < nRib; i++) {
        const x = -W / 2 + i * ribSp;
        const pts = Array.from({ length: 25 }, (_, k) => { const th = (k / 24) * Math.PI / 2; return new THREE.Vector3(x, h0 - r + (r + 8) * Math.cos(th), (r + 8) * Math.sin(th)); });
        const rib = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 13, 8, false), metal);
        rib.castShadow = true; aw.add(rib);
      }
      frontY = h0 - r; frontZ = r;
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, W, 12), metal);
      bar.rotation.z = Math.PI / 2; bar.position.set(0, frontY, frontZ + 4); aw.add(bar);
    }

    // hông (vòm 1/4 tròn / tam giác) — mặt phẳng tại x = ±W/2, toạ độ mảnh (px vươn ra, py xuống)
    if (o.sideKind !== 'none' && tS) {
      const pts: THREE.Vector2[] = [];
      if (o.sideKind === 'quarter') {
        for (let k = 0; k <= 32; k++) { const th = (k / 32) * Math.PI / 2; pts.push(new THREE.Vector2(proj * Math.sin(th), proj - proj * Math.cos(th))); }
        pts.push(new THREE.Vector2(0, proj));
      } else pts.push(new THREE.Vector2(0, 0), new THREE.Vector2(proj, drop), new THREE.Vector2(0, drop));
      const sideDrop = o.sideKind === 'quarter' ? proj : drop;
      const sg = new THREE.ShapeGeometry(new THREE.Shape(pts), 32);
      const sMat = fabric(tS, true);
      for (const sgn of [-1, 1]) {
        const g = sg.clone();
        const p = g.attributes.position as THREE.BufferAttribute;
        const uvs: number[] = [];
        for (let i = 0; i < p.count; i++) {
          const sx = p.getX(i), sy = p.getY(i);
          uvs.push(sx / proj, 1 - sy / sideDrop);
          p.setXYZ(i, sgn * (W / 2 + 4), h0 - sy, sx);
        }
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        g.computeVertexNormals();
        const m = new THREE.Mesh(g, sMat); m.castShadow = true; aw.add(m);
      }
    }

    // diềm trước: buông từ thanh trước, lượn sóng nhẹ, càng xuống càng đung đưa
    const vTop = frontY - (kind === 'dome' ? 10 : 55);
    const val = new THREE.Mesh(surface(Math.max(60, Math.round(W / 50)), 10, (u, t) => {
      const x = -W / 2 + u * W;
      return new THREE.Vector3(x, vTop - t * valH, frontZ + 48 + (9 + 16 * t) * Math.sin(x / 210 + 0.6) * t + 6 * t);
    }), vMat);
    val.castShadow = true; aw.add(val);

    inner.add(aw);
    const az = kind === 'retract' ? 0.42 : 0.36;
    return { group: out, view: { az, el: 0.17 }, aim: 0.1, zoom: 1.12, blob: 0, swing: 0.45 };
  };
}
