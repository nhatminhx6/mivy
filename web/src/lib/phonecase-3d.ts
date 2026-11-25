'use client';
// Ốp lưng 3D: máy chung (thân bo tròn, cụm camera theo preset — KHÔNG mô phỏng máy hãng nào) lắp trong ốp:
// lưng ốp (Extrude từ đúng viền ốp + lỗ khoét camera), thành ốp ôm qua mặt kính, gờ nút bấm.
// Ốp cứng: in kín lưng + cạnh màu nền · ốp viền màu: lưng in, cạnh dẻo màu · ốp dẻo trong: vỏ trong suốt,
// lớp mực nằm trên mặt lưng (chỗ không in thấy màu máy). Cảnh: 1 máy đứng nghiêng khoe lưng + 1 máy nằm úp (lưng lên).
// Đơn vị dựng = mm (toạ độ giữa, y lên, LƯNG hướng +z), cuối cùng scale S.

import * as THREE from 'three';
import { S, svgTex, type Builder } from './mockup3d';
import { PC_BACK, PC_WALL, pcDims, type CaseType, type Rect } from './phonecase-engine';

export interface PC3DOpts {
  texA: SVGSVGElement | null; texB?: SVGSVGElement | null; fontCss: string;
  model: string; caseType: CaseType; phoneHex: string; rimHex: string; bgHex: string;
}

function rrPath<T extends THREE.Path>(p: T, cx: number, cy: number, w: number, h: number, r: number): T {
  const k = Math.min(r, w / 2 - 0.01, h / 2 - 0.01);
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  p.moveTo(x0 + k, y0);
  p.lineTo(x1 - k, y0); p.absarc(x1 - k, y0 + k, k, -Math.PI / 2, 0, false);
  p.lineTo(x1, y1 - k); p.absarc(x1 - k, y1 - k, k, 0, Math.PI / 2, false);
  p.lineTo(x0 + k, y1); p.absarc(x0 + k, y1 - k, k, Math.PI / 2, Math.PI, false);
  p.lineTo(x0, y0 + k); p.absarc(x0 + k, y0 + k, k, Math.PI, Math.PI * 1.5, false);
  return p;
}
// rect SVG (gốc trên-trái, y xuống) → tâm theo toạ độ dựng (gốc giữa, y lên)
const ctr = (W: number, H: number, r: Rect) => ({ cx: r.x + r.w / 2 - W / 2, cy: H / 2 - (r.y + r.h / 2) });

export function phoneCaseBuilder(o: PC3DOpts): Builder {
  return async (aniso) => {
    if (!o.texA) throw new Error('Chưa dựng xong thiết kế');
    const d = pcDims(o.model);
    const { W, H, r, hole, m } = d;
    const t = PC_WALL, clear = o.caseType === 'clear';
    const px = Math.min(2048, Math.round(W * 22));
    const load = async (el: SVGSVGElement) => {
      const tex = await svgTex(el, o.fontCss, px, aniso, clear ? '' : '#FFFFFF');
      tex.repeat.set(1 / W, 1 / H); tex.offset.set(0.5, 0.5); tex.needsUpdate = true;
      return tex;
    };
    const texA = await load(o.texA);
    const texB = o.texB ? await load(o.texB) : texA;
    // ốp cứng in tràn viền: cạnh ốp = màu trung bình mép thiết kế (hình quấn sang cạnh)
    const edgeHex = (() => {
      const c = texA.image as HTMLCanvasElement;
      const x = c.getContext?.('2d'); if (!x) return o.bgHex;
      const { width: w, height: h } = c; const px2 = x.getImageData(0, 0, w, h).data;
      let rr = 0, gg = 0, bb = 0, n = 0;
      const add = (i: number, j: number) => { const k = (j * w + i) * 4; if (px2[k + 3] < 128) return; rr += px2[k]; gg += px2[k + 1]; bb += px2[k + 2]; n++; };
      for (let i = 0; i < w; i += 4) { add(i, Math.round(h * 0.04)); add(i, Math.round(h * 0.96)); }
      for (let j = 0; j < h; j += 4) { add(Math.round(w * 0.04), j); add(Math.round(w * 0.96), j); }
      if (!n) return o.bgHex;
      return '#' + [rr, gg, bb].map((v) => Math.round(v / n).toString(16).padStart(2, '0')).join('');
    })();

    // vật liệu
    const sideHex = o.caseType === 'rim' ? o.rimHex : edgeHex;
    const sideMat = clear
      ? new THREE.MeshPhysicalMaterial({ color: '#F4F8FA', transparent: true, opacity: 0.3, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03, depthWrite: false })
      : new THREE.MeshPhysicalMaterial({ color: sideHex, roughness: o.caseType === 'rim' ? 0.55 : 0.3, clearcoat: o.caseType === 'rim' ? 0.15 : 0.7, clearcoatRoughness: 0.15 });
    const shellMat = clear
      ? new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.14, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, depthWrite: false })
      : null;
    const printMat = (tex: THREE.Texture) => clear
      ? new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
      : new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.3, clearcoat: o.caseType === 'hard' ? 0.85 : 0.5, clearcoatRoughness: 0.1 });
    const phoneMat = new THREE.MeshPhysicalMaterial({ color: o.phoneHex, roughness: 0.34, metalness: 0.05, clearcoat: 0.7, clearcoatRoughness: 0.12 });
    const frameMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(o.phoneHex).lerp(new THREE.Color('#9AA0A8'), 0.55), metalness: 0.85, roughness: 0.3 });
    const screenMat = new THREE.MeshPhysicalMaterial({ color: '#08090B', roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.02 });
    const ringMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(o.phoneHex).lerp(new THREE.Color('#C8CCD2'), 0.6), metalness: 0.9, roughness: 0.22 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: '#0B0D12', roughness: 0.04, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.02 });
    const coatMat = new THREE.MeshPhysicalMaterial({ color: '#3A4A78', roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.55 });
    const flashMat = new THREE.MeshStandardMaterial({ color: '#F4EAC9', emissive: '#4A4430', roughness: 0.4 });
    const moduleMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(o.phoneHex).multiplyScalar(0.92), roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 });

    const outer = () => rrPath(new THREE.Shape(), 0, 0, W, H, r);
    const hc = ctr(W, H, hole);
    const holeP = () => rrPath(new THREE.Path(), hc.cx, hc.cy, hole.w, hole.h, hole.r);
    const backShape = outer(); backShape.holes.push(holeP());

    const wallDepth = m.T + 0.9;
    const unit = (tex: THREE.Texture) => {
      const g = new THREE.Group();
      // lưng ốp
      const bev = 0.35;
      const backGeo = new THREE.ExtrudeGeometry(backShape, { depth: PC_BACK - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 28 });
      const back = new THREE.Mesh(backGeo, clear ? [shellMat!, sideMat] : [printMat(tex), sideMat]);
      back.position.z = bev; back.castShadow = true;
      g.add(back);
      if (clear) {
        const ink = new THREE.Mesh(new THREE.ShapeGeometry(backShape, 28), printMat(tex));
        ink.position.z = PC_BACK + 0.04; ink.renderOrder = 3;
        g.add(ink);
      }
      // thành ốp (ôm quanh máy, nhô qua mặt kính)
      const ring = outer(); ring.holes.push(rrPath(new THREE.Path(), 0, 0, W - t * 2, H - t * 2, r - t));
      const wb = 0.3;
      const wall = new THREE.Mesh(new THREE.ExtrudeGeometry(ring, { depth: wallDepth - wb * 2, bevelEnabled: true, bevelThickness: wb, bevelSize: 0.25, bevelSegments: 3, curveSegments: 28 }), sideMat);
      wall.position.z = -wallDepth + wb; wall.castShadow = true;
      g.add(wall);
      // gờ nút bấm trên thành ốp
      for (const b of d.buttons) {
        const bump = new THREE.Mesh(new THREE.BoxGeometry(0.9, b.len, 3.4), sideMat);
        bump.position.set((b.side === 'R' ? 1 : -1) * (W / 2 + 0.3), H / 2 - (b.y + b.len / 2), -wallDepth / 2);
        g.add(bump);
      }
      // thân máy
      const pb = 1.1;
      const body = new THREE.Mesh(new THREE.ExtrudeGeometry(rrPath(new THREE.Shape(), 0, 0, m.pW, m.pH, m.r), { depth: m.T - pb * 2, bevelEnabled: true, bevelThickness: pb, bevelSize: 0.9, bevelSegments: 5, curveSegments: 28 }), [phoneMat, frameMat]);
      body.position.z = -m.T + pb;
      g.add(body);
      const scr = new THREE.Mesh(new THREE.ShapeGeometry(rrPath(new THREE.Shape(), 0, 0, m.pW - 1.6, m.pH - 1.6, m.r - 0.8), 28), screenMat);
      scr.rotation.y = Math.PI; scr.position.z = -m.T - 0.03;
      g.add(scr);
      // cụm camera (nhô qua lỗ khoét)
      const camR: Rect = { x: m.cam.x + t, y: m.cam.y + t, w: m.cam.w, h: m.cam.h, r: m.cam.r };
      const cc = ctr(W, H, camR);
      const mb = 0.35;
      const mod = new THREE.Mesh(new THREE.ExtrudeGeometry(rrPath(new THREE.Shape(), cc.cx, cc.cy, m.cam.w, m.cam.h, m.cam.r), { depth: 1.0, bevelEnabled: true, bevelThickness: mb, bevelSize: mb, bevelSegments: 3, curveSegments: 32 }), moduleMat);
      mod.position.z = mb; mod.castShadow = true;
      g.add(mod);
      const top = 1.0 + mb * 2;
      const cyl = (rad: number, h: number, mat: THREE.Material, x: number, y: number, z: number) => {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, h, 48), mat);
        c.rotation.x = Math.PI / 2; c.position.set(x, y, z + h / 2); g.add(c); return c;
      };
      for (const l of m.lenses) {
        const lx = l.x + t - W / 2, ly = H / 2 - (l.y + t);
        cyl(l.r, 1.1, ringMat, lx, ly, top);
        cyl(l.r * 0.8, 0.25, glassMat, lx, ly, top + 1.0);
        cyl(l.r * 0.36, 0.12, coatMat, lx, ly, top + 1.22);
      }
      cyl(m.flash.r, 0.3, flashMat, m.flash.x + t - W / 2, H / 2 - (m.flash.y + t), top);
      g.traverse((n) => { if ((n as THREE.Mesh).isMesh) (n as THREE.Mesh).castShadow = true; });
      return g;
    };

    const root = new THREE.Group();
    // máy 1: đứng nghiêng nhẹ ra sau, xoay chéo khoe lưng
    const hero = new THREE.Group();
    const u1 = unit(texA);
    u1.rotation.order = 'YXZ'; u1.rotation.y = -0.28; u1.rotation.x = -0.13;
    hero.add(u1);
    let bb = new THREE.Box3().setFromObject(hero);
    hero.position.set(-W * 0.38, -bb.min.y, 0);
    root.add(hero);
    if (o.texB) {
      // ốp đôi: 2 máy đứng cạnh nhau, nửa tim 2 bên ghép thành 1 trái tim
      u1.rotation.y = -0.18;
      const pair = new THREE.Group();
      const u2 = unit(texB);
      u2.rotation.order = 'YXZ'; u2.rotation.y = -0.18; u2.rotation.x = -0.13;
      pair.add(u2);
      bb = new THREE.Box3().setFromObject(pair);
      hero.position.set(-W * 0.52, hero.position.y, 0);
      pair.position.set(W * 0.53, -bb.min.y, 0);
      root.add(pair);
    } else {
      // máy 2: nằm úp (lưng lên), phía trước bên phải
      const lie = new THREE.Group();
      const u2 = unit(texB);
      u2.rotation.x = -Math.PI / 2;
      const lieRot = new THREE.Group(); lieRot.add(u2); lieRot.rotation.y = 0.55;
      lie.add(lieRot);
      bb = new THREE.Box3().setFromObject(lie);
      lie.position.set(W * 0.95, -bb.min.y, H * 0.62);
      root.add(lie);
    }

    root.scale.setScalar(S);
    const g = new THREE.Group(); g.add(root);
    return { group: g, view: o.texB ? { az: 0.12, el: 0.16 } : { az: 0.42, el: 0.24 }, aim: 0.45, zoom: o.texB ? 1.1 : 1.42, blob: 0.45 };
  };
}
