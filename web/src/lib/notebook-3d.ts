'use client';
// Sổ tay 3D: lò xo bìa cứng (gáy wire-o kép xỏ qua lỗ đục, 1 cuốn gập + 1 cuốn mở hé thấy trang kẻ),
// sổ bìa da (góc bo mềm, vân da, logo ép kim / ép chìm, dây chun, dây đánh dấu, bút),
// sổ kraft bìa mềm (1 cuốn gập + 1 cuốn mở phẳng 2 trang cong). Texture = thiết kế khách đang xem.

import * as THREE from 'three';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';
import type { NBBind, NBFoil, NBKind } from './notebook-engine';

export interface NB3DOpts {
  kind: NBKind; bind: NBBind; wMm: number; hMm: number;
  front: SVGSVGElement | null;      // bìa trước (màu, không lề)
  frontInk: SVGSVGElement | null;   // kraft: chỉ lớp mực (nền trong suốt)
  inner: SVGSVGElement | null;      // trang ruột phải
  innerLeft: SVGSVGElement | null;  // trang ruột trái
  mask: SVGSVGElement | null;       // da: mặt nạ ép (trắng trên nền trong suốt)
  coverColor: string;               // màu mép bìa (nền bìa in) / màu da
  bandColor: string;
  foil: NBFoil; foilColor: string;
  fontCss: string;
}

const rnd = (seed: number) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };

// mép giấy xếp chồng: sọc ngang mảnh
function edgeTex(aniso: number, cream = false): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 8; c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = cream ? '#EEE6D2' : '#F3F1EC'; x.fillRect(0, 0, 8, 256);
  const r = rnd(5);
  for (let i = 0; i < 256; i += 2) { x.fillStyle = `rgba(120,110,95,${0.08 + r() * 0.14})`; x.fillRect(0, i, 8, 1); }
  const t = canvasTex(c, aniso); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function kraftTex(aniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d')!;
  x.fillStyle = '#B48C5C'; x.fillRect(0, 0, 512, 512);
  const r = rnd(9);
  for (let i = 0; i < 9000; i++) {
    const v = r();
    x.fillStyle = v > 0.5 ? `rgba(255,236,205,${0.05 + r() * 0.08})` : `rgba(80,52,25,${0.05 + r() * 0.08})`;
    x.fillRect(r() * 512, r() * 512, 1 + r() * 8, 1);
  }
  const t = canvasTex(c, aniso); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
// vân da: đốm hạt + nếp mảnh (màu) và bản xám làm bump
function leatherCanvases(color: string, w: number, h: number, mask: HTMLCanvasElement | null, deboss: boolean) {
  const col = document.createElement('canvas'); col.width = w; col.height = h;
  const bmp = document.createElement('canvas'); bmp.width = w; bmp.height = h;
  const a = col.getContext('2d')!, b = bmp.getContext('2d')!;
  a.fillStyle = color; a.fillRect(0, 0, w, h);
  b.fillStyle = '#808080'; b.fillRect(0, 0, w, h);
  const r = rnd(13);
  const n = Math.round((w * h) / 26);
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, rr = 0.8 + r() * 2.2, v = r();
    b.fillStyle = v > 0.5 ? `rgba(255,255,255,${0.12 + r() * 0.2})` : `rgba(0,0,0,${0.12 + r() * 0.22})`;
    b.beginPath(); b.arc(x, y, rr, 0, Math.PI * 2); b.fill();
    if (i % 3 === 0) { a.fillStyle = v > 0.5 ? `rgba(255,255,255,${0.025 + r() * 0.03})` : `rgba(0,0,0,${0.04 + r() * 0.05})`; a.beginPath(); a.arc(x, y, rr * 1.6, 0, Math.PI * 2); a.fill(); }
  }
  // vệt mờ lớn (da không đều màu)
  for (let i = 0; i < 40; i++) {
    const g = a.createRadialGradient(r() * w, r() * h, 0, r() * w, r() * h, 60 + r() * 160);
    g.addColorStop(0, `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},0.045)`); g.addColorStop(1, 'rgba(0,0,0,0)');
    a.fillStyle = g; a.fillRect(0, 0, w, h);
  }
  if (mask && deboss) {
    // ép chìm: vùng logo tối hơn + rìa sáng/tối lệch nhau (cảm giác lõm)
    const tint = (c: string, dx: number, dy: number, alpha: number, ctx: CanvasRenderingContext2D, op: GlobalCompositeOperation) => {
      const t = document.createElement('canvas'); t.width = w; t.height = h;
      const tx = t.getContext('2d')!;
      tx.drawImage(mask, 0, 0, w, h);
      tx.globalCompositeOperation = 'source-in'; tx.fillStyle = c; tx.fillRect(0, 0, w, h);
      ctx.save(); ctx.globalAlpha = alpha; ctx.globalCompositeOperation = op; ctx.drawImage(t, dx, dy); ctx.restore();
    };
    tint('#000', 0, 0, 0.5, a, 'source-over');
    tint('#fff', 2, 2, 0.16, a, 'source-over');
    tint('#000', -1.5, -1.5, 0.25, a, 'source-over');
    tint('#000', 0, 0, 0.9, b, 'source-over');
  }
  return { col, bmp };
}

const holeMat = () => new THREE.MeshStandardMaterial({ color: '#2A2724', roughness: 0.9 });
const offsetMat = <T extends THREE.Material>(m: T, f = -2): T => { m.polygonOffset = true; m.polygonOffsetFactor = f; m.polygonOffsetUnits = f; return m; };

/** mặt phẳng nằm ngang, texture đầu trang hướng ra xa (−z); turn = xoay 90° (gáy trên) */
function flatPlane(w: number, h: number, mat: THREE.Material, turn = false): THREE.Mesh {
  const g = new THREE.PlaneGeometry(w, h);
  g.rotateX(-Math.PI / 2);
  if (turn) g.rotateY(Math.PI / 2);
  return new THREE.Mesh(g, mat);
}

// ---------------- sổ lò xo bìa cứng ----------------
interface WireTex { front: THREE.Texture; inner: THREE.Texture; edge: THREE.Texture }
function wireBook(o: NB3DOpts, t: WireTex, open: number): THREE.Group {
  const top = o.bind === 'top';
  const Lx = (top ? o.hMm : o.wMm) * S, Lz = (top ? o.wMm : o.hMm) * S; // trục x vuông góc gáy, gáy nằm ở x = 0
  const mm = S;
  const bt = 2.2 * mm, T = (o.wMm > 160 ? 7.5 : 6.5) * mm, Ttot = bt * 2 + T;
  const Wc = Lx + 2 * mm, Hc = Lz + 4 * mm;
  const coverEdge = new THREE.MeshStandardMaterial({ color: o.coverColor, roughness: 0.62 });
  const inside = new THREE.MeshStandardMaterial({ color: '#F4F2EE', roughness: 0.85 });
  const edgeM = new THREE.MeshStandardMaterial({ map: t.edge, roughness: 0.9 });
  t.edge.repeat.set(1, 1);
  const paperTop = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.85 });
  const g = new THREE.Group();

  const back = new THREE.Mesh(new THREE.BoxGeometry(Wc, bt, Hc), coverEdge);
  back.position.set(Wc / 2, bt / 2, 0); back.castShadow = true; back.receiveShadow = true;
  g.add(back);
  const pw = Lx - 1 * mm;
  const pages = new THREE.Mesh(new THREE.BoxGeometry(pw, T, Lz), [edgeM, edgeM, paperTop, paperTop, edgeM, edgeM]);
  pages.position.set(1 * mm + pw / 2, bt + T / 2, 0); pages.castShadow = true; pages.receiveShadow = true;
  g.add(pages);
  const innerM = offsetMat(new THREE.MeshStandardMaterial({ map: t.inner, roughness: 0.82 }));
  const ip = flatPlane(top ? Lz : Lx, top ? Lx : Lz, innerM, top);
  ip.position.set(Lx / 2, bt + T + 0.02 * mm, 0); ip.receiveShadow = true;
  g.add(ip);

  // lỗ đục + vòng lò xo
  const pitch = 8.47 * mm, hx = 5 * mm;
  const n = Math.floor((Hc - 12 * mm) / pitch);
  const zs = Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * pitch);
  const hm = holeMat();
  const holeG = new THREE.PlaneGeometry(3.2 * mm, 4.2 * mm); holeG.rotateX(-Math.PI / 2);
  for (const z of zs) { const h = new THREE.Mesh(holeG, hm); h.position.set(hx, bt + T + 0.04 * mm, z); g.add(h); }

  const R = Ttot / 2 + 2.4 * mm, yc = Ttot / 2;
  const xc = hx - Math.sqrt(R * R - (Ttot / 2) ** 2);
  const wire = new THREE.MeshStandardMaterial({ color: '#C9CED4', metalness: 1, roughness: 0.22 });
  const loop = new THREE.TorusGeometry(R, 0.42 * mm, 8, 48);
  for (const z of zs) for (const dz of [-0.95 * mm, 0.95 * mm]) {
    const lp = new THREE.Mesh(loop, wire);
    lp.position.set(xc, yc, z + dz); lp.castShadow = true;
    g.add(lp);
  }

  // bìa trước: xoay quanh tâm vòng lò xo (mở hé)
  const pivot = new THREE.Group(); pivot.position.set(xc, yc, 0);
  const fc = new THREE.Mesh(new THREE.BoxGeometry(Wc, bt, Hc), coverEdge);
  fc.position.set(Wc / 2 - xc, bt + T + bt / 2 - yc, 0); fc.castShadow = true; fc.receiveShadow = true;
  pivot.add(fc);
  const frontM = new THREE.MeshPhysicalMaterial({ map: t.front, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.5 });
  offsetMat(frontM);
  const fp = flatPlane(top ? Hc : Wc, top ? Wc : Hc, frontM, top);
  fp.position.set(Wc / 2 - xc, Ttot + 0.03 * mm - yc, 0);
  pivot.add(fp);
  const inPl = flatPlane(Wc, Hc, offsetMat(inside.clone()));
  inPl.rotation.x = Math.PI; // mặt trong bìa (quay xuống)
  inPl.position.set(Wc / 2 - xc, bt + T - 0.03 * mm - yc, 0);
  pivot.add(inPl);
  for (const z of zs) { const h = new THREE.Mesh(holeG, hm); h.position.set(hx - xc, Ttot + 0.06 * mm - yc, z); pivot.add(h); }
  pivot.rotation.z = open;
  g.add(pivot);
  return g;
}

// ---------------- sổ bìa da ----------------
function roundedRect(w: number, h: number, rL: number, rR: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(rL, 0); s.lineTo(w - rR, 0); s.quadraticCurveTo(w, 0, w, rR);
  s.lineTo(w, h - rR); s.quadraticCurveTo(w, h, w - rR, h);
  s.lineTo(rL, h); s.quadraticCurveTo(0, h, 0, h - rL);
  s.lineTo(0, rL); s.quadraticCurveTo(0, 0, rL, 0);
  return s;
}
async function leatherBook(o: NB3DOpts, aniso: number): Promise<THREE.Group> {
  const mm = S, W = o.wMm, H = o.hMm;
  const Wc = W + 4, Hc = H + 6; // mm
  const tc = 2.6, bev = 0.9, T = W > 160 ? 15 : 13;
  const Ttot = (tc * 2 + T) * mm;
  const g = new THREE.Group();

  let maskCanvas: HTMLCanvasElement | null = null;
  let maskTex: THREE.Texture | null = null;
  if (o.mask) {
    maskTex = await svgTex(o.mask, o.fontCss, 1400, aniso, '');
    maskCanvas = maskTex.image as HTMLCanvasElement;
  }
  const deboss = o.foil === 'deboss';
  const pxW = 1024, pxH = Math.round((1024 * Hc) / Wc);
  const { col, bmp } = leatherCanvases(o.coverColor, pxW, pxH, maskCanvas, deboss);
  const colT = canvasTex(col, aniso), bmpT = canvasTex(bmp, aniso);
  bmpT.colorSpace = THREE.NoColorSpace;
  for (const t of [colT, bmpT]) t.repeat.set(1 / Wc, 1 / Hc);
  const capM = new THREE.MeshPhysicalMaterial({ map: colT, bumpMap: bmpT, bumpScale: 2.2, roughness: 0.6, sheen: 0.12, sheenRoughness: 0.8, sheenColor: new THREE.Color('#ffffff'), clearcoat: 0.12, clearcoatRoughness: 0.6 });
  const sideM = new THREE.MeshStandardMaterial({ color: o.coverColor, roughness: 0.6 });

  const shape = roundedRect(Wc, Hc, 2.2, 6);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: tc - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 12 });
  geo.translate(0, 0, bev);
  const cover = (y: number) => {
    const m = new THREE.Mesh(geo, [capM, sideM]);
    m.scale.set(mm, mm, mm);
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, y, (Hc / 2) * mm);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  g.add(cover(0));
  g.add(cover((tc + T) * mm));

  // ruột (mép kem)
  const et = edgeTex(aniso, true); et.repeat.set(1, T / 24);
  const edgeM = new THREE.MeshStandardMaterial({ map: et, roughness: 0.92 });
  const blockW = (Wc - 5.5) * mm, blockH = (Hc - 6) * mm;
  const pages = new THREE.Mesh(new THREE.BoxGeometry(blockW, T * mm, blockH), [edgeM, edgeM, edgeM, edgeM, edgeM, edgeM]);
  pages.position.set(2.2 * mm + blockW / 2, (tc + T / 2) * mm, 0); pages.receiveShadow = true;
  g.add(pages);

  // gáy tròn bọc da
  const rs = Ttot / 2;
  const sp = new THREE.CylinderGeometry(rs, rs, (Hc - 1.2) * mm, 32, 1, false, Math.PI, Math.PI);
  sp.rotateX(Math.PI / 2);
  const spineM = new THREE.MeshPhysicalMaterial({ color: o.coverColor, roughness: 0.6, sheen: 0.12, sheenRoughness: 0.8, sheenColor: new THREE.Color('#ffffff'), bumpMap: bmpT, bumpScale: 1.2 });
  const spine = new THREE.Mesh(sp, spineM);
  spine.position.set(2.2 * mm, rs, 0); spine.castShadow = true;
  g.add(spine);

  // lá kim (ép kim) trên mặt bìa
  if (maskTex && !deboss) {
    maskTex.colorSpace = THREE.NoColorSpace;
    const foilM = new THREE.MeshPhysicalMaterial({ color: o.foilColor, metalness: 1, roughness: 0.24, alphaMap: maskTex, transparent: true, alphaTest: 0.35, clearcoat: 0.3 });
    offsetMat(foilM, -3);
    const fp = flatPlane(W * mm, H * mm, foilM);
    fp.position.set((Wc / 2) * mm, Ttot + 0.04 * mm, 0);
    g.add(fp);
  }

  // dây chun dọc (gần mép phải) ôm qua đầu + đuôi sổ
  const bandC = document.createElement('canvas'); bandC.width = 64; bandC.height = 8;
  const bx = bandC.getContext('2d')!; bx.fillStyle = o.bandColor; bx.fillRect(0, 0, 64, 8);
  for (let i = 0; i < 64; i += 3) { bx.fillStyle = 'rgba(255,255,255,0.07)'; bx.fillRect(i, 0, 1, 8); }
  const bandT = canvasTex(bandC, aniso); bandT.wrapS = bandT.wrapT = THREE.RepeatWrapping; bandT.repeat.set(1, 40);
  const bandM = new THREE.MeshStandardMaterial({ map: bandT, roughness: 0.85 });
  const bwid = 7 * mm, bthk = 0.9 * mm, bxp = (Wc - 15) * mm;
  const bTop = new THREE.Mesh(new THREE.BoxGeometry(bwid, bthk, (Hc + 0.6) * mm), bandM);
  bTop.position.set(bxp, Ttot + bthk / 2, 0); bTop.castShadow = true;
  g.add(bTop);
  for (const sgn of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(bwid, Ttot + bthk * 2, bthk), bandM);
    e.position.set(bxp, Ttot / 2, sgn * ((Hc / 2) * mm + bthk / 2)); e.castShadow = true;
    g.add(e);
  }

  // dây đánh dấu (ruy băng satin) thò ra đuôi sổ, rủ xuống bàn
  const ribC = o.foil === 'silver' ? '#7A1F2B' : o.foil === 'deboss' ? '#2C2A28' : '#8E1F24';
  const z0 = (Hc / 2 - 3) * mm, rx = W * 0.4 * mm, ym = (tc + T * 0.55) * mm;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(rx, ym, z0 - 4 * mm), new THREE.Vector3(rx, ym, z0 + 1.5 * mm), new THREE.Vector3(rx + 1.5 * mm, ym * 0.6, z0 + 6 * mm),
    new THREE.Vector3(rx + 3.5 * mm, 0.35 * mm, z0 + 12 * mm), new THREE.Vector3(rx + 7 * mm, 0.3 * mm, z0 + 26 * mm), new THREE.Vector3(rx + 10 * mm, 0.3 * mm, z0 + 40 * mm),
  ]);
  const N = 60, rw = 3 * mm, pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, p = curve.getPointAt(u), tg = curve.getTangentAt(u);
    const side = new THREE.Vector3().crossVectors(tg, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(rw);
    const cut = i === N ? 2.4 * mm : 0; // cắt xéo đuôi
    pos.push(p.x - side.x, p.y, p.z - side.z + cut, p.x + side.x, p.y, p.z + side.z);
    if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rg.setIndex(idx); rg.computeVertexNormals();
  const rib = new THREE.Mesh(rg, new THREE.MeshPhysicalMaterial({ color: ribC, roughness: 0.38, sheen: 1, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.35, side: THREE.DoubleSide }));
  rib.castShadow = true;
  g.add(rib);
  return g;
}

function pen(accent: string): THREE.Group {
  const mm = S, g = new THREE.Group();
  const r = 4.3 * mm, L = 138 * mm;
  const bodyM = new THREE.MeshPhysicalMaterial({ color: '#16181C', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 });
  const metal = new THREE.MeshStandardMaterial({ color: accent, metalness: 1, roughness: 0.25 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, L * 0.7, 40), bodyM); body.position.y = -L * 0.05;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, L * 0.3, 40), bodyM); cap.position.y = L * 0.45;
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.05, r * 1.05, 3 * mm, 40), metal); ring.position.y = L * 0.3;
  const capTop = new THREE.Mesh(new THREE.SphereGeometry(r * 1.02, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), bodyM); capTop.position.y = L * 0.6;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(r * 0.92, 16 * mm, 40), metal); tip.position.y = -L * 0.4 - 8 * mm; tip.rotation.x = Math.PI;
  // trục bút dọc y → xoay nằm dọc trục z; kẹp đặt ở −z cục bộ → sau khi xoay hướng lên trên
  const clip = new THREE.Mesh(new THREE.BoxGeometry(2.2 * mm, L * 0.24, 1.2 * mm), metal); clip.position.set(0, L * 0.46, -(r + 0.8 * mm));
  for (const m of [body, cap, ring, capTop, tip, clip]) { m.castShadow = true; g.add(m); }
  g.rotation.x = Math.PI / 2;
  const out = new THREE.Group(); out.add(g);
  out.position.y = r;
  return out;
}

// ---------------- sổ kraft bìa mềm ----------------
function kraftClosed(o: NB3DOpts, front: THREE.Texture, kt: THREE.Texture, edge: THREE.Texture): THREE.Group {
  const mm = S, W = o.wMm * mm, H = o.hMm * mm;
  const tcv = 0.45 * mm, T = (o.wMm < 120 ? 4.2 : 5.5) * mm, Ttot = tcv * 2 + T;
  const g = new THREE.Group();
  const kM = new THREE.MeshStandardMaterial({ map: kt, roughness: 0.92, color: '#E9E2D6' });
  kt.repeat.set(o.wMm / 110, o.hMm / 110);
  const edgeM = new THREE.MeshStandardMaterial({ map: edge, roughness: 0.92 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(W, tcv, H), kM); b.position.set(W / 2, tcv / 2, 0); b.castShadow = true; b.receiveShadow = true;
  const p = new THREE.Mesh(new THREE.BoxGeometry(W - 0.8 * mm, T, H - 0.8 * mm), edgeM); p.position.set(W / 2 - 0.4 * mm, tcv + T / 2, 0);
  const f = new THREE.Mesh(new THREE.BoxGeometry(W, tcv, H), kM); f.position.set(W / 2, tcv + T + tcv / 2, 0); f.castShadow = true;
  const ink = flatPlane(W, H, offsetMat(new THREE.MeshStandardMaterial({ map: front, transparent: true, roughness: 0.75 })));
  ink.position.set(W / 2, Ttot + 0.02 * mm, 0);
  const rs = Ttot / 2;
  const sp = new THREE.CylinderGeometry(rs, rs, H, 24, 1, true, Math.PI, Math.PI); sp.rotateX(Math.PI / 2);
  const spine = new THREE.Mesh(sp, new THREE.MeshStandardMaterial({ color: '#B8935F', roughness: 0.9, side: THREE.DoubleSide }));
  spine.position.set(0.2 * mm, rs, 0);
  // chỉ khâu gáy (lộ ở gáy sổ kraft)
  const stitchM = new THREE.MeshStandardMaterial({ color: '#F1E9D8', roughness: 0.8 });
  const n = Math.floor(o.hMm / 14);
  for (let i = 0; i < n; i++) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.5 * mm, 0.5 * mm, 5 * mm), stitchM);
    st.position.set(0.2 * mm - rs - 0.05 * mm, rs, (i - (n - 1) / 2) * 14 * mm);
    g.add(st);
  }
  for (const m of [b, p, f, ink, spine]) g.add(m);
  return g;
}
function kraftOpen(o: NB3DOpts, left: THREE.Texture, right: THREE.Texture, kt: THREE.Texture, edge: THREE.Texture): THREE.Group {
  const mm = S, W = o.wMm, H = o.hMm;
  const half = (o.wMm < 120 ? 2.1 : 2.75); // mm mỗi bên
  const g = new THREE.Group();
  const kM = new THREE.MeshStandardMaterial({ map: kt, roughness: 0.9 });
  const cov = new THREE.Mesh(new THREE.BoxGeometry((W * 2 + 3) * mm, 0.45 * mm, (H + 0.6) * mm), kM);
  cov.position.y = 0.225 * mm; cov.receiveShadow = true; cov.castShadow = true;
  g.add(cov);
  // mặt cắt trang cong: thấp sát gáy, phồng lên rồi phẳng ra mép
  const prof = (u: number) => half * (0.35 + 0.65 * Math.sin(Math.min(1, u * 3.2) * Math.PI / 2)) * (1 - 0.12 * u);
  const edgeM = new THREE.MeshStandardMaterial({ map: edge, roughness: 0.92 });
  edge.repeat.set(1 / 20, 1 / 6);
  for (const sgn of [1, -1]) {
    const pw = W - 0.6;
    const sh = new THREE.Shape(); sh.moveTo(0, 0);
    const N = 40;
    for (let i = 0; i <= N; i++) { const u = i / N; sh.lineTo(u * pw, prof(u)); }
    sh.lineTo(pw, 0); sh.lineTo(0, 0);
    const blk = new THREE.ExtrudeGeometry(sh, { depth: H - 0.6, bevelEnabled: false, curveSegments: 4 });
    const m = new THREE.Mesh(blk, edgeM);
    m.scale.set(sgn * mm, mm, mm);
    m.position.set(0, 0.45 * mm, -((H - 0.6) / 2) * mm);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
    // mặt trang (texture) bám theo mặt cong
    const pg = new THREE.PlaneGeometry(pw, H - 0.6, N, 1);
    pg.rotateX(-Math.PI / 2);
    const pa = pg.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pa.count; i++) {
      const x0 = pa.getX(i);
      // phải: 0..pw (gáy → mép), trái: −pw..0 (mép → gáy) — KHÔNG lật scale để chữ trên trang không bị ngược
      const x = sgn > 0 ? x0 + pw / 2 : x0 - pw / 2;
      pa.setX(i, x); pa.setY(i, prof(Math.abs(x) / pw) + 0.03);
    }
    pg.computeVertexNormals();
    const mesh = new THREE.Mesh(pg, offsetMat(new THREE.MeshStandardMaterial({ map: sgn > 0 ? right : left, roughness: 0.85 })));
    mesh.scale.set(mm, mm, mm);
    mesh.position.y = 0.45 * mm;
    mesh.receiveShadow = true;
    g.add(mesh);
  }
  return g;
}

// ---------------- dựng cảnh ----------------
export function notebookBuilder(o: NB3DOpts): Builder {
  return async (aniso) => {
    const mm = S;
    const out = new THREE.Group();
    if (o.kind === 'wire') {
      if (!o.front || !o.inner) throw new Error('Chưa dựng xong bìa');
      const [front, inner] = await Promise.all([svgTex(o.front, o.fontCss, 1400, aniso), svgTex(o.inner, o.fontCss, 2000, aniso)]);
      const edge = edgeTex(aniso); edge.repeat.set(1, 0.5);
      const tx: WireTex = { front, inner, edge };
      const A = wireBook(o, tx, 0);
      const B = wireBook(o, tx, o.bind === 'top' ? 2.78 : 2.05); // gáy trên: bìa ngả hẳn ra sau (đứng thẳng sẽ che khung)
      const top = o.bind === 'top';
      const wrap = (g: THREE.Group) => { const p = new THREE.Group(); if (top) g.rotation.y = -Math.PI / 2; p.add(g); const bb = new THREE.Box3().setFromObject(g); g.position.x -= (bb.min.x + bb.max.x) / 2; g.position.z -= (bb.min.z + bb.max.z) / 2; return p; };
      const a = wrap(A), b = wrap(B);
      const W = o.wMm * mm, H = o.hMm * mm;
      if (top) {
        b.position.set(-W * 0.58, 0, -H * 0.08); b.rotation.y = 0.12;
        a.position.set(W * 0.6, 0, H * 0.12); a.rotation.y = -0.1;
      } else {
        b.position.set(-W * 0.62, 0, -H * 0.06); b.rotation.y = 0.1;
        a.position.set(W * 0.62, 0, H * 0.08); a.rotation.y = -0.12;
      }
      out.add(b, a);
      return { group: out, view: { az: 0.12, el: 0.66 }, aim: 0.3, zoom: o.bind === 'top' ? 1.55 : 1.48, blob: 0 };
    }
    if (o.kind === 'leather') {
      const book = await leatherBook(o, aniso);
      const bb = new THREE.Box3().setFromObject(book);
      book.position.x -= (bb.min.x + bb.max.x) / 2; book.position.z -= (bb.min.z + bb.max.z) / 2;
      const holder = new THREE.Group(); holder.add(book); holder.rotation.y = -0.12;
      out.add(holder);
      const p = pen(o.foil === 'silver' ? '#C9CED4' : o.foil === 'copper' ? '#C07A4A' : '#CFAE5A');
      p.position.set((o.wMm * 0.5 + 34) * mm, 0, 10 * mm); p.rotation.y = 0.2;
      out.add(p);
      return { group: out, view: { az: 0.2, el: 0.58 }, aim: 0.3, zoom: 1.32, blob: 0 };
    }
    // kraft
    if (!o.frontInk || !o.inner || !o.innerLeft) throw new Error('Chưa dựng xong bìa');
    const [ink, inR, inL] = await Promise.all([
      svgTex(o.frontInk, o.fontCss, 1200, aniso, ''), svgTex(o.inner, o.fontCss, 1800, aniso), svgTex(o.innerLeft, o.fontCss, 1800, aniso),
    ]);
    const kt = kraftTex(aniso), kt2 = kraftTex(aniso);
    kt2.repeat.set((o.wMm * 2) / 110, o.hMm / 110);
    const edge = edgeTex(aniso, true); edge.repeat.set(1, 0.4);
    const edge2 = edgeTex(aniso, true);
    const closed = kraftClosed(o, ink, kt, edge);
    const opened = kraftOpen(o, inL, inR, kt2, edge2);
    const W = o.wMm * mm, H = o.hMm * mm;
    const c1 = new THREE.Group(); c1.add(closed);
    const bb = new THREE.Box3().setFromObject(closed); closed.position.x -= (bb.min.x + bb.max.x) / 2;
    const openTop = new THREE.Box3().setFromObject(opened).max.y;
    // flat-lay: cuốn mở phẳng phía sau, cuốn gập đè lên góc dưới phải
    opened.position.set(-W * 0.12, 0, -H * 0.16); opened.rotation.y = 0.05;
    c1.position.set(W * 0.78, openTop * 0.55, H * 0.36); c1.rotation.y = -0.2;
    out.add(opened, c1);
    return { group: out, view: { az: 0.08, el: 0.72 }, aim: 0.3, zoom: 1.62, blob: 0 };
  };
}
