'use client';
// Lịch để bàn 3D (chữ A): tấm bìa cứng trước + sau, đế, gáy lò xo kép (wire-o) xỏ qua lỗ đục ở đỉnh,
// tập 13 tờ treo trên mặt trước — các tờ đã lật vắt ra sau. Texture = trang khách đang xem.

import * as THREE from 'three';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

function kraft(aniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d')!;
  x.fillStyle = '#A9845C'; x.fillRect(0, 0, 512, 512);
  let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 9000; i++) {
    const v = r();
    x.fillStyle = v > 0.5 ? `rgba(255,236,205,${0.05 + r() * 0.07})` : `rgba(70,45,20,${0.05 + r() * 0.08})`;
    x.fillRect(r() * 512, r() * 512, 1 + r() * 7, 1);
  }
  const t = canvasTex(c, aniso);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function calendarBuilder(o: { el: SVGSVGElement | null; wMm: number; hMm: number; fontCss: string; page: number; pages: number }): Builder {
  return async (aniso) => {
    if (!o.el) throw new Error('Chưa dựng xong trang lịch');
    const art = await svgTex(o.el, o.fontCss, 2000, aniso);
    const w = o.wMm * S, h = o.hMm * S;
    const mm = S;
    const tf = 70 * (Math.PI / 180), tb = 63 * (Math.PI / 180); // dốc mặt trước / sau
    const boardT = 2 * mm, pageT = 0.28 * mm;
    const pTop = 1.6 * mm;                    // mép trên tờ lịch cách đỉnh (dọc theo dốc)
    const Lf = pTop + h + 5 * mm;             // bìa trước dài hơn tờ lịch 1 chút
    const Ytop = Lf * Math.sin(tf);
    const Lb = Ytop / Math.sin(tb);
    const nFront = Math.max(1, o.pages - o.page), nBack = o.pages - nFront;

    const g = new THREE.Group();
    const kt = kraft(aniso);
    kt.repeat.set(w / (120 * mm), Lf / (120 * mm));
    const board = new THREE.MeshStandardMaterial({ map: kt, roughness: 0.88 });
    const boardEdge = new THREE.MeshStandardMaterial({ color: '#8C6B47', roughness: 0.95 });
    const paperEdge = new THREE.MeshStandardMaterial({ color: '#EEEBE4', roughness: 0.9 });
    const paperBack = new THREE.MeshStandardMaterial({ color: '#F7F5F0', roughness: 0.8 });
    const face = new THREE.MeshPhysicalMaterial({ map: art, roughness: 0.48, clearcoat: 0.18, clearcoatRoughness: 0.45 });
    const holeMat = new THREE.MeshStandardMaterial({ color: '#2B2723', roughness: 0.9 });

    // BoxGeometry: +x, -x, +y, -y, +z, -z
    const slab = (wx: number, len: number, t: number, front: THREE.Material, back: THREE.Material, edge: THREE.Material) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(wx, len, t), [edge, edge, edge, edge, front, back]);
      m.castShadow = true;
      return m;
    };

    // tâm vòng lò xo: hơi trên đỉnh, bán kính 6mm → đi qua lỗ ~5mm dưới đỉnh ở cả 2 dốc
    const R = 6 * mm, cUp = 1.05 * mm;
    const holeS = (theta: number) => -cUp * Math.sin(theta) + Math.sqrt(cUp * cUp * Math.sin(theta) ** 2 - cUp * cUp + R * R);
    const pitch = 8.47 * mm;
    const nLoops = Math.floor((w - 14 * mm) / pitch);
    const xs = Array.from({ length: nLoops }, (_, i) => (i - (nLoops - 1) / 2) * pitch);

    // lỗ đục dưới đỉnh; outward = -1 → mặt lỗ quay ra phía -z (mặt ngoài bìa sau)
    const holes = (parent: THREE.Object3D, s: number, z: number, outward = 1) => {
      const geo = new THREE.PlaneGeometry(3.4 * mm, 3 * mm);
      for (const x of xs) {
        const hm = new THREE.Mesh(geo, holeMat);
        hm.position.set(x, -s, z);
        if (outward < 0) hm.rotation.y = Math.PI;
        parent.add(hm);
      }
    };

    // ---- mặt trước: bìa + tập tờ lịch (tờ trên cùng = trang đang xem) ----
    const fg = new THREE.Group();
    fg.position.y = Ytop;
    fg.rotation.x = -(Math.PI / 2 - tf);
    const fBoard = slab(w, Lf, boardT, board, board, boardEdge);
    fBoard.position.set(0, -Lf / 2, -boardT / 2);
    fg.add(fBoard);
    const tpF = nFront * pageT;
    const stack = slab(w, h, tpF, face, paperBack, paperEdge);
    stack.position.set(0, -pTop - h / 2, tpF / 2);
    fg.add(stack);
    holes(fg, holeS(tf), tpF + 0.05 * mm);
    g.add(fg);

    // ---- mặt sau: bìa (+ các tờ đã lật vắt ra sau) ----
    const bg = new THREE.Group();
    bg.position.y = Ytop;
    bg.rotation.x = Math.PI / 2 - tb;
    const bBoard = slab(w, Lb, boardT, board, board, boardEdge);
    bBoard.position.set(0, -Lb / 2, boardT / 2); // local +z = trong lòng chữ A; mặt ngoài = -z
    bg.add(bBoard);
    if (nBack > 0) {
      const tpB = nBack * pageT;
      const flipped = slab(w, h, tpB, paperBack, paperBack, paperEdge);
      flipped.position.set(0, -pTop - h / 2, -tpB / 2);
      bg.add(flipped);
      holes(bg, holeS(tb), -tpB - 0.05 * mm, -1);
    } else {
      holes(bg, holeS(tb), -0.05 * mm, -1);
    }
    g.add(bg);

    // ---- đế: tấm bìa nằm dưới nối chân 2 dốc ----
    const zF = Lf * Math.cos(tf), zB = -Lb * Math.cos(tb);
    const base = slab(w, zF - zB, boardT, board, board, boardEdge);
    base.rotation.x = -Math.PI / 2;
    base.position.set(0, boardT / 2, (zF + zB) / 2);
    base.castShadow = false;
    g.add(base);

    // ---- gáy lò xo kép (wire-o) ----
    const wire = new THREE.MeshStandardMaterial({ color: '#D3D7DC', metalness: 1, roughness: 0.24 });
    const loopGeo = new THREE.TorusGeometry(R, 0.42 * mm, 8, 40);
    for (const x of xs) {
      for (const dx of [-0.95 * mm, 0.95 * mm]) {
        const lp = new THREE.Mesh(loopGeo, wire);
        lp.rotation.y = Math.PI / 2;
        lp.position.set(x + dx, Ytop + cUp, 0);
        lp.castShadow = true;
        g.add(lp);
      }
    }

    // canh giữa theo chiều sâu
    const bb = new THREE.Box3().setFromObject(g);
    g.position.z = -(bb.min.z + bb.max.z) / 2;
    const out = new THREE.Group(); out.add(g);
    return { group: out, view: { az: 0.52, el: 0.2 }, aim: 0.5, zoom: 1.18, blob: 0.55 };
  };
}

// ======================= LỊCH TREO TƯỜNG 3D =======================
// Treo trên tường (mặt phẳng nhận bóng vô hình phía sau → nền studio thành bức tường, có bóng mềm đổ lên):
// đinh + dây treo đỏ, nẹp thiếc ôm đầu tập lịch, các tờ cong nhẹ ở mép dưới, tờ đã lật nằm sau sát tường.

function curledSheet(w: number, h: number, curl: number, seg = 28): THREE.PlaneGeometry {
  const g = new THREE.PlaneGeometry(w, h, 24, seg);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const t = Math.max(0, (h / 2 - y) / h - 0.06);           // 0 ở đầu (dưới nẹp) → 1 ở mép dưới
    const edge = 1 + 0.45 * (x / (w / 2)) ** 2;             // 2 góc dưới cong hơn
    pos.setZ(i, curl * Math.pow(t, 2.6) * edge);
  }
  g.computeVertexNormals();
  return g;
}

export function wallCalendarBuilder(o: { el: SVGSVGElement | null; wMm: number; hMm: number; fontCss: string; page: number; pages: number; strip: string }): Builder {
  return async (aniso) => {
    if (!o.el) throw new Error('Chưa dựng xong tờ lịch');
    const art = await svgTex(o.el, o.fontCss, 2200, aniso);
    const mm = S;
    const w = o.wMm * mm, h = o.hMm * mm;
    const pageT = 0.16 * mm;
    const nFront = Math.max(1, o.pages - o.page), nBack = o.pages - nFront;
    const lift = h * 0.95;                                      // đáy lịch cách mặt đất (treo trên tường)
    const gapWall = 2.5 * mm;

    const g = new THREE.Group();                              // hệ toạ độ lịch: y = 0 đáy, z = 0 mặt tường
    const cal = new THREE.Group();

    // tập tờ phía trước (tờ trên cùng = trang đang xem), cong nhẹ dần về mép dưới
    const paperFront = new THREE.MeshStandardMaterial({ color: '#F4F1EA', roughness: 0.75, side: THREE.FrontSide });
    const paperBack = new THREE.MeshStandardMaterial({ color: '#ECE8E0', roughness: 0.85, side: THREE.BackSide });
    const face = new THREE.MeshPhysicalMaterial({ map: art, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.4, side: THREE.FrontSide });
    const show = Math.min(nFront, 6);                         // số lớp giấy nhìn thấy ở mép
    const zBack = gapWall + nBack * pageT;
    for (let i = 0; i < show; i++) {
      const top = i === show - 1;
      const z = zBack + (nFront - show + i + 1) * pageT;
      const curl = (9 + i * 1.1) * mm;
      const geo = curledSheet(w, h, curl);
      const front = new THREE.Mesh(geo, top ? face : paperFront);
      const back = new THREE.Mesh(geo, paperBack);
      for (const m of [front, back]) { m.position.set(0, h / 2, z); m.castShadow = true; cal.add(m); }
    }
    // các tờ đã lật: nằm sau, áp sát tường (chỉ thấy khi xoay)
    if (nBack > 0) {
      const flat = new THREE.Mesh(new THREE.BoxGeometry(w * 0.998, h * 0.995, nBack * pageT), new THREE.MeshStandardMaterial({ color: '#EEEAE2', roughness: 0.85 }));
      flat.position.set(0, h / 2 + h * 0.0025, gapWall + (nBack * pageT) / 2);
      cal.add(flat);
    }

    // nẹp thiếc ôm đầu tập lịch (gập 2 mặt) + gờ dập
    const stackT = zBack + nFront * pageT - gapWall;
    const metal = new THREE.MeshStandardMaterial({ color: o.strip, metalness: 0.85, roughness: 0.3 });
    const sH = 11 * mm, sD = stackT + 1.6 * mm;
    const strip = new THREE.Mesh(new RoundedBoxGeometry(w + 1.6 * mm, sH, sD, 3, 0.6 * mm), metal);
    strip.position.set(0, h - sH / 2 + 1 * mm, gapWall + stackT / 2);
    strip.castShadow = true;
    cal.add(strip);
    const ridgeMat = new THREE.MeshStandardMaterial({ color: o.strip, metalness: 0.9, roughness: 0.22 });
    for (const dy of [-2.6 * mm, 2.6 * mm]) {
      const rg = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * mm, 0.35 * mm, w - 4 * mm, 8), ridgeMat);
      rg.rotation.z = Math.PI / 2;
      rg.position.set(0, h - sH / 2 + 1 * mm + dy, gapWall + stackT / 2 + sD / 2 + 0.05 * mm);
      cal.add(rg);
    }

    // khoen treo 2 bên + dây đỏ lên đinh (tam giác)
    const zFront = gapWall + stackT / 2 + sD / 2;
    const eyeMat = new THREE.MeshStandardMaterial({ color: '#D9DCE1', metalness: 1, roughness: 0.25 });
    const ex = w * 0.2, ey = h - 1.5 * mm;
    const nailY = h + w * 0.17, nailZ = 0;
    const cordMat = new THREE.MeshStandardMaterial({ color: '#B3121B', roughness: 0.7 });
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.TorusGeometry(2.2 * mm, 0.55 * mm, 10, 28), eyeMat);
      eye.position.set(sx * ex, ey + 2.2 * mm, zFront - 1.2 * mm);
      eye.rotation.y = Math.PI / 2;
      eye.castShadow = true;
      cal.add(eye);
      const a = new THREE.Vector3(sx * ex, ey + 4.2 * mm, zFront - 1.2 * mm);
      const mid = new THREE.Vector3(sx * ex * 0.5, (ey + nailY) / 2 + 2 * mm, (zFront + nailZ + 6 * mm) / 2);
      const top = new THREE.Vector3(sx * 0.9 * mm, nailY + 1.2 * mm, nailZ + 5 * mm);
      const cord = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, mid, top]), 24, 0.6 * mm, 8), cordMat);
      cord.castShadow = true;
      cal.add(cord);
    }
    // đinh: thân + mũ
    const nailMat = new THREE.MeshStandardMaterial({ color: '#8A8F96', metalness: 0.9, roughness: 0.35 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.9 * mm, 0.9 * mm, 9 * mm, 12), nailMat);
    shaft.rotation.x = Math.PI / 2; shaft.position.set(0, nailY, 4.5 * mm); shaft.castShadow = true;
    const head = new THREE.Mesh(new THREE.CylinderGeometry(2.6 * mm, 2.6 * mm, 0.9 * mm, 20), nailMat);
    head.rotation.x = Math.PI / 2; head.position.set(0, nailY, 9.2 * mm); head.castShadow = true;
    g.add(shaft, head);

    // lịch treo hơi chúi ra ở đầu (dây kéo), đáy tựa tường
    cal.rotation.x = 0.022;
    g.add(cal);

    // tường: mặt phẳng chỉ nhận bóng (nền studio phía sau đóng vai bức tường)
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.55, (h + w * 0.17) * 1.32), new THREE.ShadowMaterial({ opacity: 0.34 }));
    wall.position.set(0, (h + w * 0.17) / 2, -0.2 * mm);
    wall.receiveShadow = true;
    g.add(wall);
    // bóng đổ mềm của tờ lịch lên tường (lệch phải-dưới như đèn chiếu chéo) — ảnh sản phẩm treo tường
    const PW = 1.3, PH = 1.2;                                  // khung bóng rộng hơn tờ lịch để mép mờ tắt hẳn
    const sc = document.createElement('canvas'); sc.width = 256; sc.height = Math.round(256 * (h * PH) / (w * PW));
    const sx = sc.getContext('2d')!;
    const mx = (sc.width - sc.width / PW) / 2, my = (sc.height - sc.height / PH) / 2;
    sx.filter = 'blur(11px)';
    sx.fillStyle = 'rgba(0,0,0,0.6)';
    sx.fillRect(mx, my, sc.width - mx * 2, sc.height - my * 2);
    const drop = new THREE.Mesh(new THREE.PlaneGeometry(w * PW, h * PH), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, opacity: 0.4, depthWrite: false }));
    drop.position.set(w * 0.03, h / 2 - h * 0.025, 0.15 * mm);
    g.add(drop);

    g.position.y = lift;
    const out = new THREE.Group(); out.add(g);
    return { group: out, view: { az: 0.38, el: 0.06 }, aim: 0.5, zoom: 1.6, blob: 0, swing: 0.55 };
  };
}

// ======================= LỊCH BLOC 3D =======================
// Bảng treo bìa cứng (in tranh) treo đinh bằng dây đỏ; tập bloc dày theo số tờ còn lại (xé tới ngày đang xem),
// gáy bloc bìa cứng + 2 ghim ở trên, mép giấy sọc nhiều lớp, tờ trên cùng = ngày đang xem, góc dưới hơi cong lên.

function stripeTex(aniso: number, vertical: boolean): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = '#F3F0E9'; x.fillRect(0, 0, 256, 256);
  let s = 11; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 256; i += 2) {
    x.fillStyle = `rgba(120,110,95,${0.05 + r() * 0.14})`;
    if (vertical) x.fillRect(i, 0, 1, 256); else x.fillRect(0, i, 256, 1);
  }
  const t = canvasTex(c, aniso);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// tờ giấy phẳng, góc dưới-phải cong vểnh lên (như tờ sắp xé), mép dưới hơi uốn
function peelSheet(w: number, h: number, lift: number, reach: number): THREE.PlaneGeometry {
  const g = new THREE.PlaneGeometry(w, h, 30, 40);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const d = Math.hypot(x - w / 2, (y + h / 2) * 1.15);
    const c = Math.max(0, 1 - d / reach);
    const bottom = Math.max(0, (-y / h) - 0.1);              // nửa dưới uốn nhẹ ra ngoài
    pos.setZ(i, lift * c * c * (3 - 2 * c) + lift * 0.12 * bottom * bottom);
  }
  g.computeVertexNormals();
  return g;
}

export function blocCalendarBuilder(o: {
  board: SVGSVGElement | null; sheet: SVGSVGElement | null; fontCss: string;
  wMm: number; hMm: number; blocW: number; blocH: number; slotX: number; slotY: number; doy: number; total: number; accent: string;
}): Builder {
  return async (aniso) => {
    if (!o.board || !o.sheet) throw new Error('Chưa dựng xong lịch bloc');
    const [boardArt, sheetArt] = await Promise.all([svgTex(o.board, o.fontCss, 2048, aniso), svgTex(o.sheet, o.fontCss, 1400, aniso)]);
    const mm = S;
    const W = o.wMm * mm, H = o.hMm * mm, BT = 2.6 * mm;
    const bw = o.blocW * mm, bh = o.blocH * mm;
    const lift = H * 0.55;
    const gapWall = 1.5 * mm;

    const g = new THREE.Group();
    const cal = new THREE.Group();

    // bảng bìa cứng: mặt trước in, cạnh xám bìa, lưng kraft
    const edge = new THREE.MeshStandardMaterial({ color: '#8C857A', roughness: 0.9 });
    const back = new THREE.MeshStandardMaterial({ map: kraft(aniso), roughness: 0.95 });
    const front = new THREE.MeshPhysicalMaterial({ map: boardArt, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.45 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(W, H, BT), [edge, edge, edge, edge, front, back]);
    board.position.set(0, H / 2, gapWall + BT / 2);
    board.castShadow = true; board.receiveShadow = true;
    cal.add(board);
    const zBoard = gapWall + BT;

    // tập bloc: dày theo số tờ còn lại (365 tờ ≈ 26mm)
    const remain = Math.max(1, o.total - o.doy + 1);
    const T = Math.max(1.6, 26 * remain / o.total) * mm;
    const cx = (o.slotX + o.blocW / 2) * mm - W / 2;           // tâm bloc theo x
    const top = H - o.slotY * mm;                               // mép trên bloc
    const cy = top - bh / 2;
    const sideV = stripeTex(aniso, true); sideV.repeat.set(1, 1);
    const sideH = stripeTex(aniso, false); sideH.repeat.set(1, 1);
    const paper = new THREE.MeshStandardMaterial({ color: '#F6F3EC', roughness: 0.85 });
    const sx = new THREE.MeshStandardMaterial({ map: sideV, roughness: 0.9 });
    const sy = new THREE.MeshStandardMaterial({ map: sideH, roughness: 0.9 });
    const stack = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.996, bh * 0.994, T), [sx, sx, sy, sy, paper, paper]);
    stack.position.set(cx, cy - bh * 0.003, zBoard + T / 2);
    stack.castShadow = true; stack.receiveShadow = true;
    cal.add(stack);

    // tờ dưới (hơi vểnh) + tờ trên cùng = ngày đang xem (vểnh nhiều hơn)
    const under = new THREE.Mesh(peelSheet(bw, bh, 5 * mm, bw * 0.55), new THREE.MeshStandardMaterial({ color: '#FBFAF6', roughness: 0.8, side: THREE.DoubleSide }));
    under.position.set(cx, cy, zBoard + T + 0.08 * mm);
    under.castShadow = true;
    cal.add(under);
    const topFace = new THREE.MeshPhysicalMaterial({ map: sheetArt, roughness: 0.62, side: THREE.FrontSide });
    const topBack = new THREE.MeshStandardMaterial({ color: '#F1EEE7', roughness: 0.85, side: THREE.BackSide });
    const tg = peelSheet(bw, bh, 19 * mm, bw * 0.6);
    for (const m of [new THREE.Mesh(tg, topFace), new THREE.Mesh(tg, topBack)]) {
      m.position.set(cx, cy, zBoard + T + 0.22 * mm); m.castShadow = true; cal.add(m);
    }

    // gáy bloc: bìa cứng màu ôm đầu tập + 2 ghim kim loại
    const capH = 15 * mm, capD = T + 1.8 * mm;
    const capMat = new THREE.MeshStandardMaterial({ color: o.accent, roughness: 0.55 });
    const cap = new THREE.Mesh(new RoundedBoxGeometry(bw + 2.4 * mm, capH, capD, 3, 0.7 * mm), capMat);
    cap.position.set(cx, top - capH / 2 + 2 * mm, zBoard + capD / 2);
    cap.castShadow = true;
    cal.add(cap);
    const staple = new THREE.MeshStandardMaterial({ color: '#D7DAE0', metalness: 1, roughness: 0.25 });
    for (const sxp of [-0.28, 0.28]) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(9 * mm, 0.9 * mm, 0.5 * mm), staple);
      st.position.set(cx + sxp * bw, top - capH / 2 + 2 * mm, zBoard + capD + 0.2 * mm);
      cal.add(st);
    }

    // khoen + dây đỏ lên đinh
    const eyeMat = new THREE.MeshStandardMaterial({ color: '#D9DCE1', metalness: 1, roughness: 0.25 });
    const ex = W * 0.22, ey = H - 9 * mm;
    const nailY = H + W * 0.16;
    const cordMat = new THREE.MeshStandardMaterial({ color: '#B3121B', roughness: 0.7 });
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.TorusGeometry(2.6 * mm, 0.7 * mm, 10, 28), eyeMat);
      eye.position.set(s * ex, ey, zBoard + 0.2 * mm);
      cal.add(eye);
      const a = new THREE.Vector3(s * ex, ey, zBoard + 0.6 * mm);
      const mid = new THREE.Vector3(s * ex * 0.5, (ey + nailY) / 2 + 3 * mm, zBoard * 0.6 + 4 * mm);
      const tp = new THREE.Vector3(s * 0.9 * mm, nailY + 1.2 * mm, 5 * mm);
      const cord = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, mid, tp]), 24, 0.75 * mm, 8), cordMat);
      cord.castShadow = true;
      cal.add(cord);
    }
    const nailMat = new THREE.MeshStandardMaterial({ color: '#8A8F96', metalness: 0.9, roughness: 0.35 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1 * mm, 1 * mm, 10 * mm, 12), nailMat);
    shaft.rotation.x = Math.PI / 2; shaft.position.set(0, nailY, 5 * mm); shaft.castShadow = true;
    const head = new THREE.Mesh(new THREE.CylinderGeometry(3 * mm, 3 * mm, 1 * mm, 20), nailMat);
    head.rotation.x = Math.PI / 2; head.position.set(0, nailY, 10.2 * mm); head.castShadow = true;
    g.add(shaft, head);

    cal.rotation.x = 0.02;
    g.add(cal);

    // tường nhận bóng + bóng đổ mềm lệch phải-dưới
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.6, (H + W * 0.16) * 1.3), new THREE.ShadowMaterial({ opacity: 0.32 }));
    wall.position.set(0, (H + W * 0.16) / 2, -0.2 * mm);
    wall.receiveShadow = true;
    g.add(wall);
    const PW = 1.3, PH = 1.22;
    const sc = document.createElement('canvas'); sc.width = 256; sc.height = Math.round(256 * (H * PH) / (W * PW));
    const sx2 = sc.getContext('2d')!;
    const mx = (sc.width - sc.width / PW) / 2, my = (sc.height - sc.height / PH) / 2;
    sx2.filter = 'blur(12px)'; sx2.fillStyle = 'rgba(0,0,0,0.62)';
    sx2.fillRect(mx, my, sc.width - mx * 2, sc.height - my * 2);
    const drop = new THREE.Mesh(new THREE.PlaneGeometry(W * PW, H * PH), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, opacity: 0.42, depthWrite: false }));
    drop.position.set(W * 0.035, H / 2 - H * 0.03, 0.15 * mm);
    g.add(drop);

    g.position.y = lift;
    const out = new THREE.Group(); out.add(g);
    return { group: out, view: { az: 0.34, el: 0.08 }, aim: 0.53, zoom: 1.78, blob: 0, swing: 0.55 };
  };
}
