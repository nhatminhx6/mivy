'use client';
// Menu dạng sổ 3D: mặt bàn gỗ óc chó tối, 1 cuốn menu MỞ giữa bàn (2 trang ép plastic bóng, cong nhẹ vào gáy,
// chồng tờ dày theo số trang, ốc vít gáy hoặc chỉ khâu) + 1 cuốn GẬP phía sau thấy bìa (da vân + logo ép kim /
// ép chìm, hoặc bìa in màu / bìa nhựa bóng). Texture = thiết kế khách đang xem.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';
import { selfContainedSvg, svgToCanvas } from './svg-export';
import type { MBBind, MBCover, MBFoil } from './menubook-engine';

export interface MB3DOpts {
  wMm: number; hMm: number; cover: MBCover; bind: MBBind;
  sheets: number; spread: number; spreads: number;
  left: SVGSVGElement | null; right: SVGSVGElement | null;
  front: SVGSVGElement | null;   // bìa trước in màu (hard/pvc) — da: bản xem trên nền da
  mask: SVGSVGElement | null;    // da: mặt nạ ép (trắng trên nền trong suốt)
  leatherColor: string; foil: MBFoil; foilColor: string;
  coverColor: string; insideColor: string;
  fontCss: string;
}

const rnd = (seed: number) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };

function shade(hex: string, k: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)));
  return `#${((f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).padStart(6, '0')}`;
}

// mặt bàn gỗ óc chó: vân dọc theo chiều dài + ván ghép
function walnutTex(aniso: number): THREE.CanvasTexture {
  const W = 2048, H = 1024;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  const r = rnd(11);
  const planks = 4;
  for (let p = 0; p < planks; p++) {
    const y0 = (p * H) / planks, ph = H / planks;
    const base = ['#3E271A', '#462C1D', '#3A2418', '#432A1B'][p % 4];
    x.fillStyle = base; x.fillRect(0, y0, W, ph);
    for (let i = 0; i < 90; i++) {
      const yy = y0 + r() * ph, amp = 1 + r() * 6, ph0 = r() * 6, fr = 0.002 + r() * 0.004;
      x.strokeStyle = r() > 0.5 ? '#24150C' : '#5A3A26'; x.globalAlpha = 0.08 + r() * 0.22; x.lineWidth = 0.6 + r() * 2.2;
      x.beginPath();
      for (let px = 0; px <= W; px += 24) { const y = yy + Math.sin(px * fr + ph0) * amp + Math.sin(px * fr * 2.7 + ph0) * amp * 0.3; if (px) x.lineTo(px, y); else x.moveTo(px, y); }
      x.stroke();
    }
    x.globalAlpha = 1;
    x.fillStyle = 'rgba(10,5,2,0.55)'; x.fillRect(0, y0, W, 2);
  }
  const t = canvasTex(c, aniso);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// mép chồng tờ ép plastic: sọc mảnh trắng ngà
function edgeTex(aniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 8; c.height = 128;
  const x = c.getContext('2d')!;
  x.fillStyle = '#F2EFE8'; x.fillRect(0, 0, 8, 128);
  const r = rnd(5);
  for (let i = 0; i < 128; i += 4) { x.fillStyle = `rgba(110,100,85,${0.18 + r() * 0.2})`; x.fillRect(0, i, 8, 1); }
  const t = canvasTex(c, aniso); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// vân da (màu + bump), có thể ép kim (metalness map) hoặc ép chìm theo mặt nạ
async function leatherMats(o: MB3DOpts, aniso: number, w: number, h: number, withMask: boolean) {
  const col = document.createElement('canvas'); col.width = w; col.height = h;
  const bmp = document.createElement('canvas'); bmp.width = w; bmp.height = h;
  const met = document.createElement('canvas'); met.width = w; met.height = h;
  const rgh = document.createElement('canvas'); rgh.width = w; rgh.height = h;
  const a = col.getContext('2d')!, b = bmp.getContext('2d')!, m = met.getContext('2d')!, g = rgh.getContext('2d')!;
  a.fillStyle = o.leatherColor; a.fillRect(0, 0, w, h);
  b.fillStyle = '#808080'; b.fillRect(0, 0, w, h);
  m.fillStyle = '#000000'; m.fillRect(0, 0, w, h);
  g.fillStyle = '#A8A8A8'; g.fillRect(0, 0, w, h);
  const r = rnd(13);
  const n = Math.round((w * h) / 22);
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, rr = 0.8 + r() * 2.4, v = r();
    b.fillStyle = v > 0.5 ? `rgba(255,255,255,${0.12 + r() * 0.2})` : `rgba(0,0,0,${0.14 + r() * 0.22})`;
    b.beginPath(); b.arc(x, y, rr, 0, Math.PI * 2); b.fill();
    if (i % 3 === 0) { a.fillStyle = v > 0.5 ? `rgba(255,255,255,${0.03 + r() * 0.03})` : `rgba(0,0,0,${0.05 + r() * 0.05})`; a.beginPath(); a.arc(x, y, rr * 1.7, 0, Math.PI * 2); a.fill(); }
  }
  for (let i = 0; i < 40; i++) {
    const gx = r() * w, gy = r() * h;
    const gr = a.createRadialGradient(gx, gy, 0, gx, gy, 60 + r() * 200);
    gr.addColorStop(0, `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},0.05)`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    a.fillStyle = gr; a.fillRect(0, 0, w, h);
  }
  // đường chỉ may viền (cách mép 6mm)
  const mmx = w / (o.wMm + 4);
  a.save(); a.strokeStyle = shade(o.leatherColor, 0.22); a.globalAlpha = 0.7; a.lineWidth = Math.max(1, mmx * 0.35); a.setLineDash([mmx * 2.2, mmx * 1.3]);
  a.strokeRect(mmx * 5, mmx * 5, w - mmx * 10, h - mmx * 10); a.restore();
  b.save(); b.strokeStyle = '#2A2A2A'; b.lineWidth = Math.max(1, mmx * 0.5); b.setLineDash([mmx * 2.2, mmx * 1.3]);
  b.strokeRect(mmx * 5, mmx * 5, w - mmx * 10, h - mmx * 10); b.restore();

  if (withMask && o.mask) {
    const mk = await svgToCanvas(await selfContainedSvg(o.mask, o.fontCss), w, h);
    const tint = (color: string) => {
      const t = document.createElement('canvas'); t.width = w; t.height = h;
      const tx = t.getContext('2d')!; tx.drawImage(mk, 0, 0, w, h);
      tx.globalCompositeOperation = 'source-in'; tx.fillStyle = color; tx.fillRect(0, 0, w, h);
      return t;
    };
    if (o.foil === 'deboss') {
      a.save(); a.globalAlpha = 0.55; a.drawImage(tint('#000'), 0, 0); a.restore();
      a.save(); a.globalAlpha = 0.18; a.drawImage(tint('#fff'), 2, 2); a.restore();
      b.drawImage(tint('#000'), 0, 0);
      b.save(); b.globalAlpha = 0.6; b.drawImage(tint('#000'), 0, 0); b.restore();
    } else {
      a.drawImage(tint(o.foilColor), 0, 0);
      m.drawImage(tint('#FFFFFF'), 0, 0);
      g.drawImage(tint('#3A3A3A'), 0, 0);
      b.save(); b.globalAlpha = 0.5; b.drawImage(tint('#000'), 0, 0); b.restore(); // lá kim ép lún nhẹ
    }
  }
  const map = canvasTex(col, aniso);
  const bump = new THREE.CanvasTexture(bmp);
  const metal = new THREE.CanvasTexture(met);
  const rough = new THREE.CanvasTexture(rgh);
  return new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 0.6, metalnessMap: metal, metalness: 1, roughnessMap: rough, roughness: 1 });
}

const offsetMat = <T extends THREE.Material>(mt: T, f = -2): T => { mt.polygonOffset = true; mt.polygonOffsetFactor = f; mt.polygonOffsetUnits = f; return mt; };

/** trang cong: d = khoảng cách tới mép gáy; trũng vào gáy, phồng nhẹ rồi hơi rủ ở mép ngoài */
function pageGeo(w: number, h: number, side: -1 | 1): THREE.BufferGeometry {
  const seg = 48;
  const g = new THREE.PlaneGeometry(w, h, seg, 2);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const d = side === 1 ? x + w / 2 : w / 2 - x; // 0 ở mép gáy
    const y = 2.4 * (1 - Math.exp(-d / 13)) - 1.6 - 0.7 * Math.pow(d / w, 3);
    pos.setY(i, y);
  }
  g.computeVertexNormals();
  return g;
}

export function menubookBuilder(o: MB3DOpts): Builder {
  return async (aniso) => {
    const W = o.wMm, H = o.hMm;
    const bw = W + 4, bh = H + 6, bt = 3, sg = 7;
    const TH = 18;
    const leather = o.cover === 'leather';
    const pvc = o.cover === 'pvc';
    const mm = new THREE.Group(); // đơn vị mm, scale S sau
    const content = new THREE.Group();

    // ----- vật liệu bìa -----
    const edgeCol = leather ? o.leatherColor : o.coverColor;
    const edgeMat = new THREE.MeshPhysicalMaterial({ color: edgeCol, roughness: leather ? 0.62 : pvc ? 0.18 : 0.5, clearcoat: pvc ? 1 : 0.2, clearcoatRoughness: 0.15 });
    const insideMat = leather
      ? new THREE.MeshStandardMaterial({ color: shade(o.leatherColor, 0.06), roughness: 0.75 })
      : new THREE.MeshPhysicalMaterial({ color: o.insideColor, roughness: pvc ? 0.2 : 0.7, clearcoat: pvc ? 1 : 0, clearcoatRoughness: 0.12 });
    const texW = 1400;
    const leatherTop = leather ? await leatherMats(o, aniso, Math.round(texW * 0.75), Math.round(texW * 0.75 * (bh / bw)), true) : null;
    const leatherIn = leather ? await leatherMats({ ...o, leatherColor: shade(o.leatherColor, 0.05) }, aniso, 512, Math.round(512 * (bh / bw)), false) : null;

    // ----- cuốn MỞ -----
    const open = new THREE.Group();
    const sheetT = 0.6;
    const leftSheets = Math.max(1, o.spread + 1), rightSheets = Math.max(1, o.sheets - o.spread);
    const tL = leftSheets * sheetT, tR = rightSheets * sheetT;
    const boardMats = (top: THREE.Material) => [edgeMat, edgeMat, top, edgeMat, edgeMat, edgeMat];
    for (const side of [-1, 1] as const) {
      const board = new THREE.Mesh(new RoundedBoxGeometry(bw, bt, bh, 3, leather ? 1.2 : 0.6), boardMats(leatherIn || insideMat));
      board.position.set(side * (sg / 2 + bw / 2), TH + bt / 2, 0);
      board.castShadow = true; board.receiveShadow = true;
      open.add(board);
    }
    // gáy nối 2 tấm bìa
    const spine = new THREE.Mesh(new THREE.BoxGeometry(sg + 6, 1.4, bh - 1), leatherIn || edgeMat);
    spine.position.set(0, TH + 0.7, 0); spine.receiveShadow = true;
    open.add(spine);

    // chồng tờ + 2 trang đang mở
    const eTex = edgeTex(aniso);
    const edgeM = new THREE.MeshStandardMaterial({ map: eTex, roughness: 0.55 });
    const whiteTop = new THREE.MeshStandardMaterial({ color: '#F4F1EA', roughness: 0.6 });
    const [ltex, rtex] = await Promise.all([
      o.left ? svgTex(o.left, o.fontCss, 1500, aniso) : Promise.resolve(null),
      o.right ? svgTex(o.right, o.fontCss, 1500, aniso) : Promise.resolve(null),
    ]);
    const pageMat = (t: THREE.Texture | null) => offsetMat(new THREE.MeshPhysicalMaterial({ map: t, color: t ? '#FFFFFF' : '#F4F1EA', roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.1 }));
    const inner = 1.2; // mép trang cách tâm gáy
    for (const side of [-1, 1] as const) {
      const t = side === -1 ? tL : tR;
      const base = TH + bt + t;
      const stack = new THREE.Mesh(new THREE.BoxGeometry(W, Math.max(0.3, t - 1.6), H), [edgeM, edgeM, whiteTop, whiteTop, edgeM, edgeM]);
      stack.position.set(side * (inner + W / 2), TH + bt + Math.max(0.3, t - 1.6) / 2, 0);
      stack.castShadow = true; stack.receiveShadow = true;
      open.add(stack);
      const pg = new THREE.Mesh(pageGeo(W, H, side), pageMat(side === -1 ? ltex : rtex));
      pg.position.set(side * (inner + W / 2), base, 0);
      pg.castShadow = true; pg.receiveShadow = true;
      open.add(pg);
    }
    // rãnh gáy tối
    const gutter = new THREE.Mesh(new THREE.PlaneGeometry(inner * 2 + 1.2, H), new THREE.MeshBasicMaterial({ color: '#1B1715' }));
    gutter.rotation.x = -Math.PI / 2; gutter.position.set(0, TH + bt + Math.min(tL, tR) - 1.4, 0);
    open.add(gutter);
    if (o.bind === 'screw') {
      const chrome = new THREE.MeshStandardMaterial({ color: '#D9DCE0', metalness: 1, roughness: 0.22 });
      const zs = H > 250 ? [-H * 0.33, 0, H * 0.33] : [-H * 0.3, H * 0.3];
      for (const z of zs) {
        const head = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.8, 1.3, 32), chrome);
        head.position.set(0, TH + bt + Math.min(tL, tR) - 0.4, z); head.castShadow = true;
        const slot = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.3, 0.7), new THREE.MeshStandardMaterial({ color: '#6A6E74', metalness: 1, roughness: 0.4 }));
        slot.position.set(0, head.position.y + 0.66, z);
        open.add(head, slot);
      }
    } else {
      const thread = new THREE.MeshStandardMaterial({ color: '#EDE6D6', roughness: 0.8 });
      for (let z = -H / 2 + 8; z <= H / 2 - 8; z += 9) {
        const st = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 4.6), thread);
        st.position.set(0, TH + bt + Math.min(tL, tR) - 1.1, z);
        open.add(st);
      }
    }
    content.add(open);

    // ----- cuốn GẬP phía sau, nghiêng -----
    const closedT = bt * 2 + o.sheets * sheetT + 0.8;
    let topMat: THREE.Material;
    if (leatherTop) topMat = leatherTop;
    else {
      const ft = o.front ? await svgTex(o.front, o.fontCss, texW, aniso) : null;
      topMat = new THREE.MeshPhysicalMaterial({ map: ft, roughness: pvc ? 0.16 : 0.45, clearcoat: pvc ? 1 : 0.35, clearcoatRoughness: pvc ? 0.05 : 0.3 });
    }
    // mép giữa 2 tấm bìa: lộ chồng tờ
    const closed = new THREE.Group();
    const cBody = new THREE.Mesh(new RoundedBoxGeometry(bw, closedT, bh, 3, leather ? 1.4 : 0.7), [edgeMat, edgeMat, topMat, edgeMat, edgeMat, edgeMat]);
    cBody.position.y = TH + closedT / 2; cBody.castShadow = true; cBody.receiveShadow = true;
    const midEdge = new THREE.Mesh(new THREE.BoxGeometry(bw - 3, Math.max(0.6, closedT - bt * 2), bh - 0.4), [edgeM, edgeM, whiteTop, whiteTop, edgeM, edgeM]);
    midEdge.position.set(2, TH + closedT / 2, 0);
    closed.add(cBody, midEdge);
    if (o.bind === 'screw') {
      const chrome = new THREE.MeshStandardMaterial({ color: '#D9DCE0', metalness: 1, roughness: 0.22 });
      for (const z of (H > 250 ? [-H * 0.33, 0, H * 0.33] : [-H * 0.3, H * 0.3])) {
        const head = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.8, 0.9, 28), chrome);
        head.position.set(-bw / 2 + 9, TH + closedT + 0.4, z); head.castShadow = true;
        closed.add(head);
      }
    }
    // đặt cuốn gập phía sau-phải, nghiêng; lùi dần tới khi không chạm cuốn mở (khe 8mm)
    closed.rotation.y = 0.3;
    const openBox = new THREE.Box3().setFromObject(open);
    let cz = -bh * 0.55;
    closed.position.set(W * 0.62, 0, cz);
    for (let i = 0; i < 80; i++) {
      closed.updateMatrixWorld(true);
      const cb2 = new THREE.Box3().setFromObject(closed);
      if (cb2.max.z + 8 < openBox.min.z || cb2.min.x - 8 > openBox.max.x) break;
      cz -= 6; closed.position.z = cz;
    }
    content.add(closed);

    // canh giữa nội dung về gốc
    const cb = new THREE.Box3().setFromObject(content);
    const cc = cb.getCenter(new THREE.Vector3());
    content.position.set(-cc.x, 0, -cc.z - bh * 0.2); // đẩy lùi: cuốn mở gần tâm khung hơn
    const csz = cb.getSize(new THREE.Vector3());

    // ----- mặt bàn -----
    const TW = csz.x + 900, TD = csz.z + 700;
    const wood = walnutTex(aniso);
    wood.repeat.set(TW / 1100, TD / 550);
    const tableTop = new THREE.MeshPhysicalMaterial({ map: wood, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3 });
    const tableEdge = new THREE.MeshStandardMaterial({ color: '#2C1B11', roughness: 0.6 });
    const table = new THREE.Mesh(new RoundedBoxGeometry(TW, TH, TD, 4, 3), [tableEdge, tableEdge, tableTop, tableEdge, tableEdge, tableEdge]);
    table.position.y = TH / 2; table.receiveShadow = true;
    mm.add(table, content);
    mm.scale.setScalar(S);
    const out = new THREE.Group(); out.add(mm);

    const rTable = Math.hypot(TW, TD) / 2, rContent = Math.hypot(csz.x, csz.z) / 2;
    return { group: out, view: { az: -0.12, el: 0.78 }, aim: 0.5, zoom: (rTable / rContent) * 1.5, blob: 0 };
  };
}
