'use client';
// Banner hiflex + Backdrop 3D: chủ shop thấy băng rôn THẬT sẽ treo thế nào.
// - Băng rôn: bạt hiflex căng giữa 2 cột thép, dây buộc qua khoen 2 bên, mép trên lạt nhựa vào dây căng → bạt hơi phồng gió,
//   mép trên võng nhẹ giữa các khoen.
// - Backdrop: bạt căng trong khung sắt hộp (chân chữ T + thanh chống), dây chun bi buộc qua khoen mỗi ~50cm → mép bạt
//   bị kéo ra ở chỗ buộc, hơi cong vào giữa các điểm buộc (đúng kiểu bạt căng thật).
// Texture = SVG thiết kế của khách; khoen đặt đúng vị trí trong file in (grommetPoints).

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, aluminium, darkMetal, rod, svgTex, type Builder } from './mockup3d';
import { GROMMET_INSET, grommetPoints, type BNKind } from './banner-engine';

type Disp = (x: number, y: number) => { dx: number; dy: number; dz: number };

// toạ độ chạy dọc các khoen trên 1 cạnh → phần trăm khoảng giữa 2 khoen kề nhau
function between(v: number, stops: number[]): { frac: number; seg: number } {
  for (let i = 0; i < stops.length - 1; i++) {
    if (v >= stops[i] && v <= stops[i + 1]) return { frac: (v - stops[i]) / (stops[i + 1] - stops[i]), seg: stops[i + 1] - stops[i] };
  }
  return { frac: 0, seg: 0 };
}
const fall = (dist: number, k: number) => Math.max(0, 1 - dist / k) ** 2;

function rope(pts: THREE.Vector3[], r: number, mat: THREE.Material): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(pts);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(12, pts.length * 10), r, 8, false), mat);
  m.castShadow = true;
  return m;
}

export function bannerBuilder(o: { el: SVGSVGElement | null; kind: BNKind; wMm: number; hMm: number; fontCss: string }): Builder {
  return async (aniso) => {
    if (!o.el) throw new Error('Chưa dựng xong banner');
    const W = o.wMm, H = o.hMm, MIN = Math.min(W, H);
    const r = W / H;
    const art = await svgTex(o.el, o.fontCss, r >= 1 ? 4096 : Math.round(4096 * r), aniso);
    const g = new THREE.Group();
    const backdrop = o.kind === 'backdrop';
    const grom = grommetPoints(W, H);
    const xsTop = grom.filter((p) => p.y === GROMMET_INSET).map((p) => p.x).sort((a, b) => a - b);
    const ysSide = grom.filter((p) => p.x === GROMMET_INSET).map((p) => p.y).sort((a, b) => a - b);

    // ---- biến dạng bạt (mm) ----
    let disp: Disp;
    if (!backdrop) {
      const A = MIN * 0.022; // phồng gió
      disp = (x, y) => {
        const u = x / W, v = y / H;
        const env = Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
        let dz = A * env + A * 0.28 * Math.sin(2 * Math.PI * (2.1 * u + 0.7 * v) + 0.6) * env;
        // mép trên võng giữa các lạt buộc
        const t = between(x, xsTop);
        let dy = t.seg * 0.014 * Math.sin(Math.PI * t.frac) * fall(y, 140);
        // mép dưới chỉ buộc 2 góc → hơi cong lên ở giữa, gợn chéo từ góc
        dy -= H * 0.006 * Math.sin(Math.PI * u) * fall(H - y, H * 0.3);
        dz += MIN * 0.004 * Math.sin(Math.PI * u * 6) * fall(H - y, H * 0.25);
        return { dx: 0, dy, dz };
      };
    } else {
      const A = MIN * 0.0035;
      disp = (x, y) => {
        const u = x / W, v = y / H;
        const dz = A * Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
        const tx = between(x, xsTop), ty = between(y, ysSide);
        const sx = tx.seg * 0.012 * Math.sin(Math.PI * tx.frac), sy = ty.seg * 0.012 * Math.sin(Math.PI * ty.frac);
        const dy = sx * fall(y, 160) - sx * fall(H - y, 160);
        const dx = sy * fall(x, 160) - sy * fall(W - x, 160);
        return { dx, dy, dz };
      };
    }

    const yb = backdrop ? 320 : W >= H ? 1300 : 550; // mép dưới bạt cách đất (mm)
    const at = (x: number, y: number, z = 0) => { const d = disp(x, y); return new THREE.Vector3((x + d.dx - W / 2) * S, (yb + H - y - d.dy) * S, (d.dz + z) * S); };

    // ---- tấm bạt ----
    const sx = Math.min(220, Math.ceil(W / 22)), sy = Math.min(160, Math.ceil(H / 22));
    const geo = new THREE.PlaneGeometry(W * S, H * S, sx, sy);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / S + W / 2, y = H / 2 - pos.getY(i) / S;
      const p = at(x, y);
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    geo.computeVertexNormals();
    const front = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: art, roughness: 0.52, clearcoat: 0.22, clearcoatRoughness: 0.45, side: THREE.FrontSide }));
    const back = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#E9E8E3', roughness: 0.9, side: THREE.BackSide }));
    front.castShadow = back.castShadow = true;
    g.add(front, back);

    // ---- khoen (ô-dê) đúng vị trí file in ----
    const metal = new THREE.MeshStandardMaterial({ color: '#CDD1D6', metalness: 1, roughness: 0.24 });
    const ringGeo = new THREE.TorusGeometry(9 * S, 2.8 * S, 10, 28);
    for (const p of grom) {
      for (const z of [1.2, -1.2]) { const m = new THREE.Mesh(ringGeo, metal); m.position.copy(at(p.x, p.y, z)); g.add(m); }
    }

    if (!backdrop) {
      // ---- 2 cột thép + dây buộc ----
      const alu = aluminium(), dark = darkMetal();
      const ropeMat = new THREE.MeshStandardMaterial({ color: '#F1EEE6', roughness: 0.85 });
      const tie = new THREE.MeshStandardMaterial({ color: '#1C1D20', roughness: 0.6 });
      const PX = W / 2 + 220, R = 24;
      const topY = yb + H + 260;
      for (const sxn of [-1, 1]) {
        const x = sxn * PX * S;
        g.add(rod(new THREE.Vector3(x, 0, 0), new THREE.Vector3(x, topY * S, 0), R * S, alu));
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(170 * S, 178 * S, 14 * S, 40), dark);
        plate.position.set(x, 7 * S, 0); plate.castShadow = true; g.add(plate);
        const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(36 * S, 40 * S, 140 * S, 24), dark);
        sleeve.position.set(x, 84 * S, 0); sleeve.castShadow = true; g.add(sleeve);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(30 * S, 20, 14), dark);
        cap.position.set(x, topY * S, 0); g.add(cap);
        // dây buộc mép bên vào cột (mỗi khoen cạnh bên 1 sợi) + vòng quấn quanh cột
        const ex = sxn < 0 ? GROMMET_INSET : W - GROMMET_INSET;
        for (const y of ysSide) {
          const a = at(ex, y);
          const py = (yb + H - y + 15) * S;
          const b = new THREE.Vector3(x - sxn * R * S, py, 0);
          const mid = a.clone().lerp(b, 0.5); mid.y -= 10 * S;
          g.add(rope([a, mid, b], 3.6 * S, ropeMat));
          const wrap = new THREE.Mesh(new THREE.TorusGeometry((R + 4) * S, 3.6 * S, 8, 28), ropeMat);
          wrap.rotation.x = Math.PI / 2; wrap.position.set(x, py, 0); g.add(wrap);
        }
      }
      // dây căng phía trên (băng rôn ngang) + lạt nhựa đen qua từng khoen mép trên
      if (W > H) {
        const ry = yb + H + 55;
        const sag = (x: number) => 30 * Math.sin(Math.PI * (x / W));
        const pts = [-PX, -W / 2 - 40, ...xsTop.map((x) => x - W / 2), W / 2 + 40, PX].map((x) => new THREE.Vector3(x * S, (ry - (Math.abs(x) <= W / 2 ? sag(x + W / 2) : 0)) * S, 0));
        g.add(rope(pts, 3.6 * S, ropeMat));
        for (const x of xsTop) {
          const a = at(x, GROMMET_INSET);
          const top = (ry - sag(x)) * S;
          const rr = (top - a.y) / 2 + 3 * S;
          const loop = new THREE.Mesh(new THREE.TorusGeometry(rr, 1.7 * S, 6, 24), tie);
          loop.rotation.y = Math.PI / 2; loop.position.set(a.x, (top + a.y) / 2, a.z); g.add(loop);
        }
      }
      return { group: g, view: W >= H ? { az: 0.36, el: 0.07 } : { az: 0.42, el: 0.1 }, aim: 0.55, zoom: W >= H ? 1.32 : 1.12, blob: 0.25 };
    }

    // ---- backdrop: khung sắt hộp 40×40, chân chữ T, thanh chống chéo ----
    const steel = new THREE.MeshStandardMaterial({ color: '#2E3136', metalness: 0.55, roughness: 0.42 });
    const T = 40, G = 75;
    const L = -W / 2 - G, Rx = W / 2 + G, bot = yb - G, top = yb + H + G;
    const box = (w: number, h: number, d: number, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(new RoundedBoxGeometry(w * S, h * S, d * S, 2, 3 * S), steel);
      m.position.set(x * S, y * S, z * S); m.castShadow = true; g.add(m); return m;
    };
    box(Rx - L + T, T, T, 0, top, 0);          // thanh trên
    box(Rx - L + T, T, T, 0, bot, 0);          // thanh dưới
    for (const x of [L, Rx]) {
      box(T, top + T / 2, T, x, (top + T / 2) / 2, 0); // cột
      box(T, T, 900, x, T / 2, -170);                  // chân chữ T
      const capF = box(T + 6, 8, 60, x, 4, 280); capF.material = darkMetal(); // nút cao su
      g.add(rod(new THREE.Vector3(x * S, 820 * S, -T / 2 * S), new THREE.Vector3(x * S, T * S, -600 * S), 13 * S, steel)); // thanh chống
    }
    if (W >= 3500) { // cột giữa phía sau cho khung dài
      box(T, top + T / 2, T, 0, (top + T / 2) / 2, -T * 2.2);
      box(T, T, 900, 0, T / 2, -170 - T * 2.2);
      box(T, T, T * 2.2, 0, top, -T * 1.1);
    }
    // dây chun bi: khoen → thanh khung gần nhất
    const bungee = new THREE.MeshStandardMaterial({ color: '#141518', roughness: 0.5 });
    const ball = new THREE.SphereGeometry(11 * S, 14, 10);
    for (const p of grom) {
      const a = at(p.x, p.y);
      const dl = p.x, dr = W - p.x, dt = p.y, dbm = H - p.y;
      const mn = Math.min(dl, dr, dt, dbm);
      let b: THREE.Vector3;
      if (mn === dt) b = new THREE.Vector3(a.x, (top - T / 2) * S, 0);
      else if (mn === dbm) b = new THREE.Vector3(a.x, (bot + T / 2) * S, 0);
      else if (mn === dl) b = new THREE.Vector3((L + T / 2) * S, a.y, 0);
      else b = new THREE.Vector3((Rx - T / 2) * S, a.y, 0);
      const f = a.clone(); f.z += 4 * S;
      const bf = b.clone(); bf.z += 14 * S;
      g.add(rope([f, f.clone().lerp(bf, 0.5), bf], 2.6 * S, bungee));
      const bl = new THREE.Mesh(ball, bungee); bl.position.copy(b); bl.position.z += 26 * S; bl.castShadow = true; g.add(bl);
    }
    return { group: g, view: { az: 0.42, el: 0.1 }, aim: 0.5, zoom: 1.2, blob: 0.35 };
  };
}
