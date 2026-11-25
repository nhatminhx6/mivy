'use client';
// Decal dán kính 3D: mặt tiền shop — tường sơn, khung nhôm, tấm kính (trong, phản chiếu nhẹ), decal dán trên kính
// (vinyl cắt chữ đặc/ánh kim, dải mờ cản va trong mờ, decal in PP, decal 1 chiều lưới lỗ), tay nắm inox (cửa),
// phía sau là nội thất ấm hơi tối để kính "đọc" được. swing ±0.5 rad → không bao giờ thấy mặt sau tường.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';
import type { WDGeom, WDType } from './windowdecal-engine';

export interface WD3DOpts {
  tex: SVGSVGElement | null; // SVG chế độ 'tex' (chỉ decal, nền trong suốt)
  type: WDType; geom: WDGeom; gold: boolean; inside: boolean; fontCss: string;
}

const rng = (seed: number) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
const mk = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

function plaster(seed: number, a: string, b: string): HTMLCanvasElement {
  const c = mk(512, 512); const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 512, 512); g.addColorStop(0, a); g.addColorStop(1, b);
  x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  const id = x.getImageData(0, 0, 512, 512); const r = rng(seed);
  for (let i = 0; i < id.data.length; i += 4) { const k = (r() - 0.5) * 9; id.data[i] += k; id.data[i + 1] += k; id.data[i + 2] += k; }
  x.putImageData(id, 0, 0);
  return c;
}
function tiles(): HTMLCanvasElement {
  const c = mk(512, 512); const x = c.getContext('2d')!; const r = rng(9);
  x.fillStyle = '#C9C5BE'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const v = 196 + Math.round((r() - 0.5) * 14);
    x.fillStyle = `rgb(${v},${v - 3},${v - 8})`; x.fillRect(i * 128 + 2, j * 128 + 2, 124, 124);
  }
  return c;
}
function woodFloor(): HTMLCanvasElement {
  const c = mk(512, 512); const x = c.getContext('2d')!; const r = rng(4);
  for (let i = 0; i < 8; i++) {
    const v = 0.75 + r() * 0.25;
    x.fillStyle = `rgb(${Math.round(120 * v)},${Math.round(84 * v)},${Math.round(56 * v)})`; x.fillRect(0, i * 64, 512, 62);
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, i * 64 + 62, 512, 2);
  }
  return c;
}

export function windowDecalBuilder(o: WD3DOpts): Builder {
  return async (aniso) => {
    if (!o.tex) throw new Error('Chưa dựng xong decal');
    const { W, H, bottom, door } = o.geom;
    const FW = 55, FD = 70; // khung nhôm: bản rộng / sâu
    const side = Math.max(950, W * 0.8);
    const top = bottom + H + FW; // đỉnh khung
    const facW = W + FW * 2 + side * 2, facH = top + Math.max(520, H * 0.26);
    const zGlass = -FD / 2;
    const g = new THREE.Group(); // đơn vị mm, y lên, x giữa kính
    const glassY = (y: number) => bottom + (H - y); // toạ độ kính (y xuống) → độ cao

    // ---- tường mặt tiền (3 khối quanh lỗ khung) ----
    const wallTex = canvasTex(plaster(3, '#F1ECE4', '#E2DBD0'), aniso); wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(facW / 900, facH / 900);
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.94 });
    const WT = 220; // dày tường
    const wbox = (w: number, h: number, x: number, y: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, WT), wallMat);
      m.position.set(x, y + h / 2, -WT / 2 + 2); m.castShadow = true; m.receiveShadow = true; g.add(m);
    };
    const ox = W / 2 + FW;
    wbox(side, facH, -ox - side / 2, 0);
    wbox(side, facH, ox + side / 2, 0);
    wbox(ox * 2, facH - top, 0, top);
    // gờ chân tường + mái che mỏng phía trên (ánh bóng đổ xuống kính cho thật)
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(facW, 90, 30), new THREE.MeshStandardMaterial({ color: '#6E6A64', roughness: 0.8 }));
    plinth.position.set(0, 45, 15); plinth.receiveShadow = true; g.add(plinth);

    // ---- khung nhôm ----
    const alu = new THREE.MeshPhysicalMaterial({ color: '#3D4247', metalness: 0.75, roughness: 0.38, clearcoat: 0.3, clearcoatRoughness: 0.3 });
    const fbox = (w: number, h: number, x: number, y: number) => {
      const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, FD, 2, 3), alu);
      m.position.set(x, y + h / 2, -FD / 2); m.castShadow = true; m.receiveShadow = true; g.add(m);
    };
    fbox(FW, top, -W / 2 - FW / 2, 0);
    fbox(FW, top, W / 2 + FW / 2, 0);
    fbox(W + FW * 2, FW, 0, bottom + H);
    fbox(W, bottom, 0, 0); // ray dưới / chân kính

    // ---- nội thất phía sau (ấm, hơi tối) ----
    const depth = 1500; // giữ cảnh cân trước/sau kính → camera xoay quanh mặt kính
    const roomW = W + FW * 2 + 2 * side - 40;
    const room = new THREE.Group();
    const back = new THREE.Mesh(new THREE.PlaneGeometry(roomW, facH), new THREE.MeshStandardMaterial({ map: canvasTex(plaster(7, '#3E3129', '#2A211B'), aniso), roughness: 0.95 }));
    back.position.set(0, facH / 2, -depth); room.add(back);
    const flT = canvasTex(woodFloor(), aniso); flT.wrapS = flT.wrapT = THREE.RepeatWrapping; flT.repeat.set(roomW / 1400, depth / 1400);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomW, depth), new THREE.MeshStandardMaterial({ map: flT, roughness: 0.7 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 1, -depth / 2 - WT); floor.receiveShadow = true; room.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(roomW, depth), new THREE.MeshStandardMaterial({ color: '#2B2420', roughness: 1 }));
    ceil.rotation.x = Math.PI / 2; ceil.position.set(0, facH - 10, -depth / 2 - WT); room.add(ceil);
    for (const sx of [-1, 1]) {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(depth, facH), new THREE.MeshStandardMaterial({ color: '#57463A', roughness: 1 }));
      sw.rotation.y = sx * -Math.PI / 2; sw.position.set(sx * roomW / 2, facH / 2, -depth / 2 - WT); room.add(sw);
    }
    // kệ gỗ trên tường sau + vài hộp/lọ
    const wood = new THREE.MeshStandardMaterial({ color: '#7A5A3C', roughness: 0.75 });
    const r = rng(11);
    for (let k = 0; k < 3; k++) {
      const y = 1150 + k * 380;
      const sh = new THREE.Mesh(new THREE.BoxGeometry(roomW * 0.62, 30, 260), wood); sh.position.set(0, y, -depth + 140); room.add(sh);
      for (let i = 0; i < 9; i++) {
        const bw = 90 + r() * 80, bh = 110 + r() * 140;
        const col = new THREE.Color().setHSL(0.03 + r() * 0.07, 0.3 + r() * 0.25, 0.1 + r() * 0.1);
        const bx = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 120), new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 }));
        bx.position.set(-roomW * 0.28 + i * (roomW * 0.56 / 8), y + 15 + bh / 2, -depth + 140); room.add(bx);
      }
    }
    // quầy
    const counter = new THREE.Mesh(new THREE.BoxGeometry(Math.min(1600, roomW * 0.5), 950, 600), new THREE.MeshStandardMaterial({ color: '#4A3A2D', roughness: 0.65 }));
    counter.position.set(roomW * 0.18, 475, -depth * 0.62); room.add(counter);
    // đèn thả ấm (phát sáng)
    const glow = new THREE.MeshStandardMaterial({ color: '#FFE3B0', emissive: '#FFC87A', emissiveIntensity: 2.2 });
    for (let i = -1; i <= 1; i++) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(70, 24, 16), glow);
      bulb.position.set(i * Math.min(900, roomW * 0.28), facH - 650, -depth * 0.45); room.add(bulb);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 580, 6), new THREE.MeshBasicMaterial({ color: '#111' }));
      cord.position.set(bulb.position.x, facH - 650 + 360, bulb.position.z); room.add(cord);
    }
    const warm = new THREE.PointLight(0xffc98a, 2.2, depth * 2.4, 1.2); warm.position.set(0, facH - 700, -depth * 0.5);
    room.add(warm);
    g.add(room);

    // ---- vỉa hè phía trước ----
    const tt = canvasTex(tiles(), aniso); tt.wrapS = tt.wrapT = THREE.RepeatWrapping; tt.repeat.set(facW / 1200, 1500 / 1200);
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(facW, 1500), new THREE.MeshStandardMaterial({ map: tt, roughness: 0.9 }));
    walk.rotation.x = -Math.PI / 2; walk.position.set(0, 0.5, 750); walk.receiveShadow = true; g.add(walk);

    // ---- kính ----
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshPhysicalMaterial({
      color: '#C9D8DA', transparent: true, opacity: 0.12, roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02,
      specularIntensity: 1, envMapIntensity: 1.4, depthWrite: false, side: THREE.DoubleSide,
    }));
    glass.position.set(0, bottom + H / 2, zGlass); glass.renderOrder = 1; g.add(glass);
    // vệt loá chéo trên kính
    {
      const hc = mk(512, 512); const hx = hc.getContext('2d')!;
      const lg = hx.createLinearGradient(0, 0, 512, 512);
      lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.22, 'rgba(255,255,255,0)'); lg.addColorStop(0.28, 'rgba(255,255,255,0.5)');
      lg.addColorStop(0.36, 'rgba(255,255,255,0.08)'); lg.addColorStop(0.5, 'rgba(255,255,255,0)'); lg.addColorStop(0.58, 'rgba(255,255,255,0.22)'); lg.addColorStop(0.62, 'rgba(255,255,255,0)');
      hx.fillStyle = lg; hx.fillRect(0, 0, 512, 512);
      const sheen = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(hc), transparent: true, opacity: o.type === 'oneway' ? 0.18 : 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
      sheen.position.set(0, bottom + H / 2, zGlass + 1.6); sheen.renderOrder = 4; g.add(sheen);
    }

    // ---- decal ----
    const outW = Math.max(1024, Math.min(2048, Math.round(W * 1.7)));
    const dt = await svgTex(o.tex, o.fontCss, outW, aniso, '');
    let decalMap: THREE.Texture = dt;
    if (o.type === 'oneway') {
      // lưới lỗ decal 1 chiều: chấm tối đều (lỗ nhìn xuyên vào trong tối)
      const src = dt.image as HTMLCanvasElement;
      const c = mk(src.width, src.height); const x = c.getContext('2d')!;
      x.drawImage(src, 0, 0);
      const step = Math.max(4, Math.round(src.width / W * 6));
      x.fillStyle = 'rgba(10,10,12,0.32)';
      for (let yy = step / 2; yy < c.height; yy += step) for (let xx = (yy / step) % 2 ? step : step / 2; xx < c.width; xx += step) { x.beginPath(); x.arc(xx, yy, step * 0.24, 0, Math.PI * 2); x.fill(); }
      decalMap = canvasTex(c, aniso); dt.dispose();
    }
    const decalMat = new THREE.MeshPhysicalMaterial({
      map: decalMap, transparent: true, alphaTest: 0.02, depthWrite: false,
      roughness: o.type === 'cut' ? (o.gold ? 0.32 : 0.42) : o.type === 'oneway' ? 0.62 : 0.5,
      metalness: o.type === 'cut' && o.gold ? 0.55 : 0, clearcoat: o.type === 'print' ? 0.35 : 0.1, clearcoatRoughness: 0.3,
    });
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(W, H), decalMat);
    // dán mặt ngoài: hơi trước kính; dán mặt trong: hơi sau kính (vẫn đọc xuôi từ ngoài vì file in đã lật gương)
    decal.position.set(0, bottom + H / 2, zGlass + (o.inside && o.type !== 'oneway' ? -1.2 : 1.2)); decal.renderOrder = o.inside ? 0 : 2;
    g.add(decal);

    // ---- tay nắm inox (cửa) ----
    if (door) {
      const steel = new THREE.MeshPhysicalMaterial({ color: '#E7EAEE', metalness: 1, roughness: 0.18, clearcoat: 0.4 });
      const hx = -W / 2 + (W - 95);
      const y0 = 750, y1 = 1350, zOut = zGlass + 62;
      const barM = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, y1 - y0, 24), steel);
      barM.position.set(hx, (y0 + y1) / 2, zOut); barM.castShadow = true; g.add(barM);
      for (const yy of [y0 + 60, y1 - 60]) {
        const st = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 62, 16), steel);
        st.rotation.x = Math.PI / 2; st.position.set(hx, yy, zGlass + 31); st.castShadow = true; g.add(st);
      }
    }
    void glassY;

    const art = new THREE.Box3(new THREE.Vector3(-W / 2 - FW, 0, -FD), new THREE.Vector3(W / 2 + FW, top, 0));
    g.scale.setScalar(S);
    const root = new THREE.Group(); root.add(g);
    root.updateMatrixWorld(true);
    art.min.multiplyScalar(S); art.max.multiplyScalar(S);
    const all = new THREE.Box3().setFromObject(root);
    const rAll = all.getBoundingSphere(new THREE.Sphere()).radius, rArt = art.getBoundingSphere(new THREE.Sphere()).radius;
    const zoom = (rAll / rArt) * 1.1;
    const aim = (((art.min.y + art.max.y) / 2) - all.min.y) / (all.max.y - all.min.y);
    return { group: root, view: { az: 0.32, el: 0.08 }, aim, zoom, blob: 0, swing: 0.5 };
  };
}
