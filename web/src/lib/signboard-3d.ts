'use client';
// Biển báo 3D: một đoạn tường hành lang (sơn 2 tông + nẹp gỗ ngang) gắn 2–3 biển:
//  - biển chính (mica bóng / alu mờ gắn 4 ốc pát inox, hoặc decal dạ quang dán phẳng, hoặc treo cờ)
//  - biển thoát hiểm dạ quang (phát sáng xanh nhẹ + quầng sáng trên tường)
//  - 1 biển treo cờ vuông góc tường (in 2 mặt) trên tay đỡ inox
// swing ±0.55 rad: không bao giờ lộ mặt sau tường.

import * as THREE from 'three';
import { S, canvasTex, type Builder } from './mockup3d';
import { selfContainedSvg, svgToCanvas } from './svg-export';
import type { SBHole, SBMaterial } from './signboard-engine';

export interface SB3DItem {
  el: SVGSVGElement | null; // SVG chế độ 'tex'
  W: number; H: number; r: number; material: SBMaterial; holes: SBHole[]; capD: number;
}
export interface Signboard3DOpts { main: SB3DItem; exit?: SB3DItem | null; flag?: SB3DItem | null; side?: SB3DItem | null; fontCss: string }

const rng = (seed: number) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
const mk = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

// hình chữ nhật bo góc, tâm ở gốc, y hướng lên (mm)
function rrect(W: number, H: number, r: number): THREE.Shape {
  const x = -W / 2, y = -H / 2; const s = new THREE.Shape(); const rr = Math.max(0.01, Math.min(r, W / 2, H / 2));
  s.moveTo(x + rr, y); s.lineTo(x + W - rr, y); s.quadraticCurveTo(x + W, y, x + W, y + rr);
  s.lineTo(x + W, y + H - rr); s.quadraticCurveTo(x + W, y + H, x + W - rr, y + H);
  s.lineTo(x + rr, y + H); s.quadraticCurveTo(x, y + H, x, y + H - rr);
  s.lineTo(x, y + rr); s.quadraticCurveTo(x, y, x + rr, y);
  return s;
}

async function faceTex(it: SB3DItem, fontCss: string, aniso: number): Promise<{ tex: THREE.CanvasTexture; canvas: HTMLCanvasElement }> {
  if (!it.el) throw new Error('Chưa dựng xong biển');
  const outW = Math.max(900, Math.min(2048, Math.round(it.W * 7)));
  const outH = Math.max(8, Math.round((outW * it.H) / it.W));
  // outline chữ trước khi vẽ → dấu tiếng Việt chuẩn, không phụ thuộc font đã nạp kịp hay chưa
  const c = await svgToCanvas(await selfContainedSvg(it.el, fontCss, { outline: true }), outW, outH);
  const t = canvasTex(c, aniso);
  t.repeat.set(1 / it.W, 1 / it.H); t.offset.set(0.5, 0.5); t.needsUpdate = true;
  return { tex: t, canvas: c };
}

function standoff(capD: number, gap: number, chrome: THREE.Material): THREE.Group {
  const g = new THREE.Group(); const R = capD / 2, capH = capD * 0.55;
  const pts = [[0, 0], [R * 0.97, 0], [R, capH * 0.2], [R, capH * 0.6], [R * 0.93, capH * 0.86], [R * 0.72, capH * 0.98], [R * 0.35, capH], [0, capH]].map(([a, b]) => new THREE.Vector2(a, b));
  const cap = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), chrome); cap.rotation.x = Math.PI / 2; cap.castShadow = true;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.62, R * 0.62, gap, 28), chrome);
  barrel.rotation.x = Math.PI / 2; barrel.position.z = -gap / 2; barrel.castShadow = true;
  g.add(cap, barrel);
  return g;
}

// bóng mềm của tấm phẳng trên tường
function dropShadow(W: number, H: number, opacity: number): THREE.Mesh {
  const PW = 1.14, PH = 1.18;
  const c = mk(256, Math.max(48, Math.round((256 * H * PH) / (W * PW)))); const x = c.getContext('2d')!;
  x.filter = 'blur(9px)'; x.fillStyle = 'rgba(30,26,22,0.85)';
  const mx = (c.width - c.width / PW) / 2, my = (c.height - c.height / PH) / 2;
  x.fillRect(mx, my, c.width - mx * 2, c.height - my * 2);
  return new THREE.Mesh(new THREE.PlaneGeometry(W * PW, H * PH), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity, depthWrite: false }));
}

function halo(W: number, H: number, color: string, opacity: number): THREE.Mesh {
  const c = mk(256, 256); const x = c.getContext('2d')!;
  const g = x.createRadialGradient(128, 128, 30, 128, 128, 128);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  return new THREE.Mesh(new THREE.PlaneGeometry(W * 1.9, H * 2.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
}

// 1 tấm biển (toạ độ mm, tâm tấm ở gốc, mặt trước hướng +z, mặt sau ở z=0)
async function signPlate(it: SB3DItem, fontCss: string, aniso: number, chrome: THREE.Material, wallGap: number): Promise<THREE.Group> {
  const { tex } = await faceTex(it, fontCss, aniso);
  const g = new THREE.Group();
  const mat = it.material;
  const thick = mat === 'glow' ? 0.5 : mat === 'flag' ? 3 : 3;
  const shape = rrect(it.W, it.H, it.r);
  const edgeMat = mat === 'mica'
    ? new THREE.MeshPhysicalMaterial({ color: '#E9F4F1', roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.92, emissive: '#7FBFB2', emissiveIntensity: 0.12 })
    : mat === 'alu' ? new THREE.MeshStandardMaterial({ color: '#C7CBD1', metalness: 0.9, roughness: 0.3 })
      : new THREE.MeshStandardMaterial({ color: '#F2F2EE', roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 10 }), edgeMat);
  body.castShadow = true; body.receiveShadow = true;
  g.add(body);
  const faceMat = mat === 'mica'
    ? new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 })
    : mat === 'alu' ? new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.55, metalness: 0.05, clearcoat: 0.2, clearcoatRoughness: 0.5 })
      : mat === 'glow' ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: '#B6FFB8', emissiveMap: tex, emissiveIntensity: 0.32 })
        : new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.4, clearcoat: 0.4, clearcoatRoughness: 0.3 });
  const front = new THREE.Mesh(new THREE.ShapeGeometry(shape, 10), faceMat);
  front.position.z = thick + 0.06; g.add(front);
  if (mat === 'flag') {
    const back = new THREE.Mesh(new THREE.ShapeGeometry(shape, 10), faceMat);
    back.rotation.y = Math.PI; back.position.z = -0.06; g.add(back);
  }
  // ốc pát (mica/alu) — lỗ tính theo toạ độ SVG (gốc góc trên-trái, y xuống)
  if ((mat === 'mica' || mat === 'alu') && it.holes.length) {
    for (const h of it.holes) {
      const so = standoff(it.capD, wallGap + thick, chrome);
      so.position.set(h.x - it.W / 2, it.H / 2 - h.y, thick);
      g.add(so);
    }
  }
  return g;
}

export function signboardBuilder(o: Signboard3DOpts): Builder {
  return async (aniso) => {
    const chrome = new THREE.MeshPhysicalMaterial({ color: '#EEF0F2', metalness: 1, roughness: 0.12, clearcoat: 0.6, clearcoatRoughness: 0.05 });
    const brushed = new THREE.MeshStandardMaterial({ color: '#C9CDD3', metalness: 0.85, roughness: 0.32 });
    const art = new THREE.Group(); // mọi thứ gắn trên tường (mm), tường ở z = 0
    const shadows = new THREE.Group();
    const gap = 15;
    const M = o.main;
    const mainIsFlag = M.material === 'flag';

    const mountFlat = async (it: SB3DItem, cx: number, cy: number) => {
      const z0 = it.material === 'glow' ? 0.3 : gap; // decal dán sát tường, mica/alu cách tường bằng ốc pát
      const p = await signPlate(it, o.fontCss, aniso, chrome, gap);
      p.position.set(cx, cy, z0); art.add(p);
      const sh = dropShadow(it.W, it.H, it.material === 'glow' ? 0.12 : 0.3);
      sh.position.set(cx + (it.material === 'glow' ? 0.5 : gap * 0.5), cy - (it.material === 'glow' ? 0.8 : gap * 0.7), 0.25); shadows.add(sh);
      if (it.material === 'glow') { const h = halo(it.W, it.H, 'rgba(150,255,170,0.9)', 0.24); h.position.set(cx, cy, 0.2); shadows.add(h); }
    };
    // biển treo cờ: tay đỡ inox ngang từ tường, biển vuông góc tường, mặt trước hướng +x
    const mountFlag = async (it: SB3DItem, cx: number, topY: number) => {
      const p = await signPlate(it, o.fontCss, aniso, chrome, 0);
      const reach = 36 + it.W; // tay đỡ dài hơn biển
      const armY = topY + 14;
      const arm = new THREE.Mesh(new THREE.BoxGeometry(8, 8, reach), brushed); arm.position.set(cx, armY, reach / 2); arm.castShadow = true; art.add(arm);
      const base = new THREE.Mesh(new THREE.BoxGeometry(30, 64, 4), brushed); base.position.set(cx, armY - 18, 2.5); base.castShadow = true; art.add(base);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 12), chrome); cap.position.set(cx, armY, reach); art.add(cap);
      const zc = 30 + it.W / 2;
      p.rotation.y = Math.PI / 2; // mặt trước → +x
      p.position.set(cx - 1.5, topY - it.H / 2, zc);
      art.add(p);
      // 2 khoen treo
      for (const h of it.holes) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2, 1.1, 10, 24), chrome);
        ring.rotation.y = Math.PI / 2;
        ring.position.set(cx, (armY + (topY - h.y)) / 2 + 2, zc + (h.x - it.W / 2));
        ring.scale.y = 1.6; art.add(ring);
      }
    };

    // bố cục trên tường (mm), biển chính ở tâm
    if (mainIsFlag) {
      await mountFlag(M, 0, M.H / 2);
    } else {
      await mountFlat(M, 0, 0);
    }
    const ref = Math.max(M.W, M.H);
    if (o.exit) {
      const ex = o.exit;
      const x = (mainIsFlag ? 40 : M.W / 2) + 70 + ex.W / 2;
      const y = M.H / 2 + 60 + ex.H / 2 - Math.min(M.H, 200) * 0.35;
      await mountFlat(ex, x, y);
    }
    if (o.flag && !mainIsFlag) {
      await mountFlag(o.flag, -(M.W / 2 + 110), M.H / 2 + 40);
    }
    if (o.side) {
      await mountFlat(o.side, -(Math.max(M.W, 60) / 2 + 120 + o.side.W / 2), -o.side.H * 0.1);
    }

    // tường: trên sơn sáng, dưới sơn đậm hơn + nẹp gỗ ngang
    const bb = new THREE.Box3().setFromObject(art);
    const cxArt = (bb.min.x + bb.max.x) / 2;
    const wallW = Math.max(ref * 9, (bb.max.x - bb.min.x) * 3.2);
    const ext = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, ref);
    const wallTop = bb.max.y + ext * 1.1, railY = bb.min.y - Math.max(90, ref * 0.55), wallBot = railY - ext * 0.9;
    const wc = mk(512, 512); const wx = wc.getContext('2d')!;
    const gr = wx.createRadialGradient(200, 170, 30, 256, 256, 520); gr.addColorStop(0, '#F4F1EB'); gr.addColorStop(1, '#E2DDD3');
    wx.fillStyle = gr; wx.fillRect(0, 0, 512, 512);
    const id = wx.getImageData(0, 0, 512, 512); const r = rng(9);
    for (let i = 0; i < id.data.length; i += 4) { const k = (r() - 0.5) * 6; id.data[i] += k; id.data[i + 1] += k; id.data[i + 2] += k; }
    wx.putImageData(id, 0, 0);
    const wt = new THREE.CanvasTexture(wc); wt.colorSpace = THREE.SRGBColorSpace;
    const upH = wallTop - railY;
    const wallUp = new THREE.Mesh(new THREE.PlaneGeometry(wallW, upH), new THREE.MeshStandardMaterial({ map: wt, roughness: 0.95 }));
    wallUp.position.set(cxArt, railY + upH / 2, 0); wallUp.receiveShadow = true;
    const loH = railY - wallBot;
    const wallLo = new THREE.Mesh(new THREE.PlaneGeometry(wallW, loH), new THREE.MeshStandardMaterial({ color: '#7D8C86', roughness: 0.9 }));
    wallLo.position.set(cxArt, wallBot + loH / 2, 0); wallLo.receiveShadow = true;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(wallW, 26, 16), new THREE.MeshStandardMaterial({ color: '#8A6440', roughness: 0.6 }));
    rail.position.set(cxArt, railY, 8); rail.castShadow = true; rail.receiveShadow = true;

    const scene = new THREE.Group();
    scene.add(art, shadows, wallUp, wallLo, rail);
    scene.scale.setScalar(S);
    const root = new THREE.Group(); root.add(scene);
    scene.position.y = -wallBot * S; // đáy tường chạm y = 0
    root.updateMatrixWorld(true);
    const all = new THREE.Box3().setFromObject(root);
    const artBox = new THREE.Box3().setFromObject(art);
    const rAll = all.getBoundingSphere(new THREE.Sphere()).radius, rArt = artBox.getBoundingSphere(new THREE.Sphere()).radius;
    const zoom = (rAll / rArt) * 1.34;
    const aim = ((artBox.min.y + artBox.max.y) / 2 - all.min.y) / (all.max.y - all.min.y);
    return { group: root, view: { az: 0.42, el: 0.08 }, aim, zoom, blob: 0, swing: 0.55 };
  };
}
