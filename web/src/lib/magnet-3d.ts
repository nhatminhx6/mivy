'use client';
// Nam châm tủ lạnh 3D: cửa tủ lạnh mini (inox xước hoặc trắng bóng, khe cửa, tay nắm), 2 con nam châm của khách
// dán lệch nhẹ + 1 tờ giấy nhắc việc kẹp bằng nút nam châm tròn. Khối nam châm đùn từ ĐÚNG đường cắt (mm),
// mặt in cán bóng, cạnh cao su nam châm đen (hoặc mica 3mm + đế nam châm). Bóng tiếp xúc giả trên mặt cửa cho chân thật.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';

export interface Magnet3DOpts {
  print: SVGSVGElement | null;   // bản in 1 con, đúng khung thành phẩm (ngoài đường cắt trong suốt)
  d: string; wMm: number; hMm: number; // đường cắt (mm)
  material: 'flex' | 'acrylic';
  fridge: 'steel' | 'white';
  fontCss: string;
  accent: string;                // màu nút nam châm tròn
  note: string[];                // chữ trên tờ giấy nhắc
}

const NS = 'http://www.w3.org/2000/svg';
function shapesOf(d: string): THREE.Shape[] {
  const data = new SVGLoader().parse(`<svg xmlns="${NS}"><path d="${d}"/></svg>`);
  return data.paths.flatMap((p) => SVGLoader.createShapes(p));
}

// vân inox xước dọc
function brushedTex(aniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const x = c.getContext('2d')!;
  x.fillStyle = '#e9e9e9'; x.fillRect(0, 0, 512, 512);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 2600; i++) {
    const px = rnd() * 512, len = 40 + rnd() * 380, v = 205 + Math.round(rnd() * 50);
    x.strokeStyle = `rgba(${v},${v},${v},${0.15 + rnd() * 0.25})`;
    x.lineWidth = 0.6 + rnd() * 1.2;
    x.beginPath(); x.moveTo(px, rnd() * 512); x.lineTo(px + (rnd() - 0.5) * 2, rnd() * 512 + len); x.stroke();
  }
  const t = canvasTex(c, aniso);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1.6, 1.2);
  return t;
}

// bóng tiếp xúc: hình đường cắt tô đen, làm mờ → mặt phẳng trong suốt dán ngay sau nam châm
// làm mờ bằng shadowBlur (ctx.filter không phải trình duyệt nào cũng có): vẽ hình lệch hẳn ra ngoài canvas,
// chỉ để bóng (trắng, mờ) rơi vào khung → alphaMap mềm
function blurredMask(c: HTMLCanvasElement, blurPx: number, draw: (x: CanvasRenderingContext2D) => void) {
  const x = c.getContext('2d')!;
  const off = c.width * 2;
  x.save();
  x.shadowColor = '#FFFFFF'; x.shadowBlur = blurPx; x.shadowOffsetX = off;
  x.translate(-off, 0);
  draw(x);
  x.restore();
}
function shadowTex(d: string, wMm: number, hMm: number, blurMm: number, padMm: number): THREE.CanvasTexture {
  const k = 6; // px / mm
  const c = document.createElement('canvas');
  c.width = Math.ceil((wMm + padMm * 2) * k); c.height = Math.ceil((hMm + padMm * 2) * k);
  blurredMask(c, blurMm * k, (x) => { x.translate(padMm * k, padMm * k); x.scale(k, k); x.fillStyle = '#FFFFFF'; x.fill(new Path2D(d)); });
  return new THREE.CanvasTexture(c);
}

function noteTex(lines: string[], aniso: number): THREE.CanvasTexture {
  const W = 640, H = 840;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  x.fillStyle = '#FFFDF4'; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(80,140,210,0.35)'; x.lineWidth = 2;
  for (let y = 294; y < H - 30; y += 72) { x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); }
  x.strokeStyle = 'rgba(220,60,60,0.45)'; x.beginPath(); x.moveTo(78, 0); x.lineTo(78, H); x.stroke();
  x.fillStyle = '#28324A'; x.font = '400 50px "Lobster"';
  lines.slice(0, 8).forEach((ln, i) => { x.save(); x.translate(100, 282 + i * 72); x.rotate(-0.012 * (i % 3)); x.fillText(ln, 0, 0); x.restore(); });
  return canvasTex(c, aniso);
}

export function magnetBuilder(o: Magnet3DOpts): Builder {
  return async (aniso) => {
    if (!o.print) throw new Error('Chưa dựng xong nam châm');
    const W = o.wMm, H = o.hMm;
    const px = Math.min(2048, Math.max(900, Math.round(Math.max(W, H) * 22)));
    const tex = await svgTex(o.print, o.fontCss, px, aniso, '');
    tex.flipY = false; tex.repeat.set(1 / W, 1 / H); tex.needsUpdate = true;
    const shapes = shapesOf(o.d);
    const acrylic = o.material === 'acrylic';

    // ---------- tủ lạnh ----------
    const g = new THREE.Group();
    const FW = 540, FH = 900, FD = 200; // chỉ là phần cửa + thân nông: tâm xoay gần mặt cửa, nam châm luôn giữa khung
    const steel = o.fridge === 'steel';
    const brushed = steel ? brushedTex(aniso) : null;
    const doorMat = steel
      ? new THREE.MeshPhysicalMaterial({ color: '#EEF0F3', metalness: 0.8, roughness: 0.3, roughnessMap: brushed, map: brushed, clearcoat: 0.15, clearcoatRoughness: 0.4 })
      : new THREE.MeshPhysicalMaterial({ color: '#F6F6F4', metalness: 0, roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.12 });
    const bodyMat = steel
      ? new THREE.MeshPhysicalMaterial({ color: '#B9BEC4', metalness: 0.8, roughness: 0.42 })
      : new THREE.MeshPhysicalMaterial({ color: '#EDEDEA', roughness: 0.35, clearcoat: 0.4 });
    const bodyD = FD - 40;
    const body = new THREE.Mesh(new RoundedBoxGeometry(FW * S, FH * S, bodyD * S, 4, 16 * S), bodyMat);
    body.position.set(0, (FH / 2) * S, (-FD / 2 + bodyD / 2) * S);
    const front = -FD / 2 + bodyD; // mặt trước thân
    const DT = 36; // dày cánh cửa
    const fzH = 262, gap = 7, base = 12;
    const mainH = FH - base - fzH - gap - 6;
    const mkDoor = (h: number, y0: number) => {
      const m = new THREE.Mesh(new RoundedBoxGeometry((FW - 6) * S, h * S, DT * S, 5, 12 * S), doorMat);
      m.position.set(0, (y0 + h / 2) * S, (front + DT / 2) * S);
      return m;
    };
    const mainDoor = mkDoor(mainH, base);
    const fzDoor = mkDoor(fzH, base + mainH + gap);
    const gapMesh = new THREE.Mesh(new THREE.BoxGeometry((FW - 10) * S, (gap + 6) * S, 10 * S), new THREE.MeshStandardMaterial({ color: '#1C1E22', roughness: 0.9 }));
    gapMesh.position.set(0, (base + mainH + gap / 2) * S, (front + 4) * S);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry((FW - 30) * S, base * S, 12 * S), new THREE.MeshStandardMaterial({ color: '#2A2C30', roughness: 0.7 }));
    plinth.position.set(0, (base / 2) * S, (front - 2) * S);
    for (const m of [body, mainDoor, fzDoor]) { m.castShadow = true; m.receiveShadow = true; }
    g.add(body, mainDoor, fzDoor, gapMesh, plinth);
    const doorZ = front + DT; // mặt cửa

    // tay nắm dọc (thanh tròn + 2 chân đế)
    const handleMat = new THREE.MeshPhysicalMaterial({ color: steel ? '#2B2E33' : '#C8CDD3', metalness: steel ? 0.3 : 0.95, roughness: steel ? 0.35 : 0.18, clearcoat: 0.6 });
    const mkHandle = (yA: number, yB: number) => {
      const hx = FW / 2 - 42;
      const bar = new THREE.Mesh(new RoundedBoxGeometry(20 * S, (yB - yA) * S, 20 * S, 4, 8 * S), handleMat);
      bar.position.set(hx * S, ((yA + yB) / 2) * S, (doorZ + 34) * S);
      bar.castShadow = true;
      g.add(bar);
      for (const y of [yA + 16, yB - 16]) {
        const st = new THREE.Mesh(new THREE.CylinderGeometry(6 * S, 7 * S, 30 * S, 20), handleMat);
        st.rotation.x = Math.PI / 2; st.position.set(hx * S, y * S, (doorZ + 15) * S);
        g.add(st);
      }
    };
    mkHandle(base + mainH - 300, base + mainH - 40);
    mkHandle(base + mainH + gap + 30, base + mainH + gap + 190);

    // ---------- nam châm ----------
    const T = acrylic ? 3 : 0.62, BEV = acrylic ? 0.35 : 0.1;
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: T, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: 3, curveSegments: 28 });
    const cap = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.28, clearcoat: 1, clearcoatRoughness: acrylic ? 0.04 : 0.14 });
    const side = acrylic
      ? new THREE.MeshPhysicalMaterial({ color: '#E9F3F1', transparent: true, opacity: 0.62, roughness: 0.04, clearcoat: 1, metalness: 0 })
      : new THREE.MeshStandardMaterial({ color: '#26272A', roughness: 0.82 });
    const back = acrylic ? (() => {
      const sh2 = shapesOf(o.d);
      const g2 = new THREE.ExtrudeGeometry(sh2, { depth: 0.8, bevelEnabled: false, curveSegments: 20 });
      g2.translate(-W / 2, -H / 2, 0); g2.scale(0.9, 0.9, 1); g2.translate(W / 2, H / 2, 0);
      return g2;
    })() : null;
    const blackMat = new THREE.MeshStandardMaterial({ color: '#1E1F22', roughness: 0.85 });
    const sTex = shadowTex(o.d, W, H, acrylic ? 3 : 2, 6);

    const addMagnet = (cx: number, cy: number, rot: number, parentZ: number) => {
      const outer = new THREE.Group();
      outer.position.set(cx * S, cy * S, parentZ * S);
      outer.rotation.z = rot;
      const inner = new THREE.Group(); inner.scale.set(S, -S, S); // mm, y xuống → lật
      const lift = (back ? 0.8 : 0) + BEV;
      const m = new THREE.Mesh(geo, [cap, side]);
      m.position.set(-W / 2, -H / 2, lift);
      m.castShadow = true;
      inner.add(m);
      if (back) { const b = new THREE.Mesh(back, blackMat); b.position.set(-W / 2, -H / 2, 0); inner.add(b); }
      // bóng tiếp xúc (giả) ngay trên mặt cửa, lệch xuống dưới chút theo hướng đèn
      const pad = 6;
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(W + pad * 2, H + pad * 2),
        new THREE.MeshBasicMaterial({ color: '#000000', alphaMap: sTex, transparent: true, opacity: acrylic ? 0.42 : 0.3, depthWrite: false }));
      sh.position.set(acrylic ? 1.4 : 0.7, acrylic ? 3.2 : 1.9, 0.04); // y dương = xuống (đang trong hệ lật)
      sh.scale.y = -1; // texture canvas y xuống
      sh.renderOrder = 1;
      inner.add(sh);
      outer.add(inner);
      g.add(outer);
    };

    // bố cục trên cửa chính (ngay dưới khe ngăn đá): giấy nhắc bên trái, con chính giữa, bản thứ 2 lệch xuống phải
    const top = base + mainH;
    const NW = 82, NH = 108;
    let mx = 14;
    const my = top - 58 - H / 2;
    let mx2 = Math.min(mx + W / 2 + 52, FW / 2 - 78 - W / 2);
    const my2 = my - H * 0.42 - 34;
    let nx = mx - W / 2 - 64;
    const ny = top - 34 - NH / 2;
    // canh cụm (giấy nhắc → bản thứ 2) vào giữa cửa
    const sh0 = -((nx - NW / 2) + (mx2 + W / 2)) / 2;
    mx += sh0; mx2 += sh0; nx += sh0;
    addMagnet(mx, my, -0.045, doorZ);
    addMagnet(mx2, my2, 0.075, doorZ);

    // ---------- tờ giấy nhắc trên cửa ngăn đá + nút nam châm ----------
    const ng = new THREE.PlaneGeometry(NW * S, NH * S, 10, 14);
    const pos = ng.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / S, y = pos.getY(i) / S;
      const t = Math.max(0, (NH / 2 - 6 - y) / NH); // càng xa điểm kẹp càng cong ra
      const curl = Math.max(0, (x / NW + 0.5) + (0.5 - y / NH) - 1.05);
      pos.setZ(i, (t * t * 3.2 + curl * curl * 22) * S);
    }
    ng.computeVertexNormals();
    const note = new THREE.Mesh(ng, new THREE.MeshStandardMaterial({ map: noteTex(o.note, aniso), roughness: 0.92, side: THREE.DoubleSide }));
    note.position.set(nx * S, ny * S, (doorZ + 0.3) * S);
    note.rotation.z = 0.06;
    note.castShadow = true;
    g.add(note);
    const nsh = new THREE.Mesh(new THREE.PlaneGeometry((NW + 10) * S, (NH + 10) * S), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.2, depthWrite: false, alphaMap: (() => {
      const c = document.createElement('canvas'); c.width = 184; c.height = 236;
      blurredMask(c, 9, (x) => { x.fillStyle = '#fff'; x.fillRect(14, 16, 156, 206); }); return new THREE.CanvasTexture(c);
    })() }));
    nsh.position.set((nx + 2) * S, (ny - 2) * S, (doorZ + 0.08) * S); nsh.rotation.z = 0.06;
    g.add(nsh);
    const btnMat = new THREE.MeshPhysicalMaterial({ color: o.accent, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 });
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(11 * S, 11.6 * S, 7 * S, 40), btnMat);
    btn.rotation.x = Math.PI / 2;
    const bx = nx - Math.sin(0.06) * (NH / 2 - 12), by = ny + NH / 2 - 12;
    btn.position.set(bx * S, by * S, (doorZ + 4) * S);
    btn.castShadow = true;
    g.add(btn);
    const bsh = new THREE.Mesh(new THREE.CircleGeometry(15 * S, 32), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.22, depthWrite: false }));
    bsh.position.set((bx + 1.5) * S, (by - 3) * S, (doorZ + 0.5) * S);
    g.add(bsh);

    // khung hình ôm cụm nam châm + giấy nhắc (camera lấy tâm X của tủ = 0)
    const yTop = top + 14, yBot = Math.min(my2 - H / 2, my - H / 2) - 30;
    const xL = nx - NW / 2 - 26, xR = mx2 + W / 2 + 26;
    const visH = Math.max(yTop - yBot, (Math.max(-xL, xR) * 2) * 0.75);
    // tâm khung = tâm hộp bao (nằm sâu trong tủ) → khoảng cách tới mặt cửa phải cộng thêm
    const zMin = -FD / 2, zMax = doorZ + 44, cz = (zMin + zMax) / 2;
    const rad = 0.5 * Math.hypot(FW, FH, zMax - zMin);
    const tan = Math.tan(THREE.MathUtils.degToRad(13)), sin = Math.sin(THREE.MathUtils.degToRad(13));
    const want = (visH * 1.1) / (2 * tan) + (doorZ - cz);
    const zoom = ((rad / sin) * 1.1) / want;
    return { group: g, view: { az: 0.26, el: 0.1 }, aim: ((yTop + yBot) / 2) / FH, zoom, blob: 0.55, swing: 0.6 };
  };
}
