'use client';
// Tranh canvas 3D: vải canvas căng khung gỗ treo tường. Texture = bản "tex" (mặt + 4 cạnh trải phẳng) → cạnh hiện
// đúng kiểu mép khách chọn (tràn ảnh / lật gương / màu trơn). Vân vải = bump map vẽ bằng code. Bộ 3 tấm: 3 khung cách đều.

import * as THREE from 'three';
import { S, svgTex, type Builder } from './mockup3d';

type Pt = [number, number, number];

// vân sợi canvas (đan dọc–ngang) — dùng làm bumpMap, lặp lại theo kích thước thật
let weaveCanvas: HTMLCanvasElement | null = null;
function weaveTex(): THREE.CanvasTexture {
  if (!weaveCanvas) {
    const N = 256, T = 8; // 32 sợi mỗi chiều
    const c = document.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d')!;
    const img = x.createImageData(N, N);
    let seed = 7; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const jit = Array.from({ length: N / T * 2 }, () => r() * 0.25);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const ci = Math.floor(i / T), cj = Math.floor(j / T);
      const over = (ci + cj) % 2 === 0; // sợi ngang nằm trên / sợi dọc nằm trên
      const u = (i % T) / T, v = (j % T) / T;
      const hump = over ? Math.sin(Math.PI * v) * (0.75 + jit[cj]) : Math.sin(Math.PI * u) * (0.75 + jit[N / T + ci]);
      const val = Math.max(0, Math.min(255, 70 + hump * 150 + (r() - 0.5) * 30));
      const k = (j * N + i) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = val; img.data[k + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    weaveCanvas = c;
  }
  const t = new THREE.CanvasTexture(weaveCanvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// tứ giác với UV lấy từ toạ độ SVG trải phẳng (x→u, y→v, y SVG hướng xuống)
function quad(p: [Pt, Pt, Pt, Pt], uv: [number, number][], mat: THREE.Material | THREE.Material[]): THREE.Mesh {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p.flat(), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv.flat(), 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  return m;
}

/** 1 tấm: mặt trước z = D, lưng z = 0; tâm ngang ở x = 0, đáy ở y = 0 (đơn vị mm, nhân S sau) */
function panelMesh(W: number, H: number, D: number, mat: THREE.Material, backMat: THREE.Material, woodMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const TW = W + D * 2, TH = H + D * 2;
  const uvOf = (sx: number, sy: number): [number, number] => [(sx + D) / TW, 1 - (sy + D) / TH];
  const X = (sx: number) => sx - W / 2, Y = (sy: number) => H - sy;
  // mặt trước (ngược chiều kim đồng hồ nhìn từ +z): BL, BR, TR, TL
  g.add(quad([[X(0), Y(H), D], [X(W), Y(H), D], [X(W), Y(0), D], [X(0), Y(0), D]],
    [uvOf(0, H), uvOf(W, H), uvOf(W, 0), uvOf(0, 0)], mat));
  // 4 cạnh dày khung — texture: mép mặt (0 / W / H) → mép sau khung (−D / W+D / H+D)
  g.add(quad([[X(0), Y(H), D], [X(0), Y(0), D], [X(0), Y(0), 0], [X(0), Y(H), 0]],
    [uvOf(0, H), uvOf(0, 0), uvOf(-D, 0), uvOf(-D, H)], mat));
  g.add(quad([[X(W), Y(0), D], [X(W), Y(H), D], [X(W), Y(H), 0], [X(W), Y(0), 0]],
    [uvOf(W, 0), uvOf(W, H), uvOf(W + D, H), uvOf(W + D, 0)], mat));
  g.add(quad([[X(0), Y(0), D], [X(W), Y(0), D], [X(W), Y(0), 0], [X(0), Y(0), 0]],
    [uvOf(0, 0), uvOf(W, 0), uvOf(W, -D), uvOf(0, -D)], mat));
  g.add(quad([[X(W), Y(H), D], [X(0), Y(H), D], [X(0), Y(H), 0], [X(W), Y(H), 0]],
    [uvOf(W, H), uvOf(0, H), uvOf(0, H + D), uvOf(W, H + D)], mat));
  // lưng: vải mộc + nẹp gỗ (lắc ±góc nhỏ nên hầu như không thấy, vẫn dựng cho đủ khối)
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), backMat);
  back.rotation.y = Math.PI; back.position.set(0, H / 2, 0.05);
  g.add(back);
  const bw = Math.min(45, W * 0.12);
  for (const [w, h, x, y] of [[W, bw, 0, H - bw / 2], [W, bw, 0, bw / 2], [bw, H, -W / 2 + bw / 2, H / 2], [bw, H, W / 2 - bw / 2, H / 2]]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w - 2, h - 2, D * 0.85), woodMat);
    bar.position.set(x, y, D * 0.43); g.add(bar);
  }
  return g;
}

export interface Canvas3DOpts { texEls: (SVGSVGElement | null)[]; wMm: number; hMm: number; depth: number; fontCss: string; gap: number }

export function canvasBuilder(o: Canvas3DOpts): Builder {
  return async (aniso) => {
    const els = o.texEls.filter(Boolean) as SVGSVGElement[];
    if (!els.length) throw new Error('Chưa dựng xong tranh');
    const { wMm: W, hMm: H, depth: D } = o;
    const n = els.length;
    const long = Math.max(W, H) + D * 2;
    const px = Math.min(2048, Math.max(900, Math.round(long * (n > 1 ? 2.4 : 3.2))));
    const texs = await Promise.all(els.map((el) => svgTex(el, o.fontCss, W >= H ? px : Math.round(px * (W + D * 2) / (H + D * 2)), aniso)));
    const weave = weaveTex();
    const backMat = new THREE.MeshStandardMaterial({ color: '#E7DDC9', roughness: 0.95, side: THREE.FrontSide });
    const woodMat = new THREE.MeshStandardMaterial({ color: '#C79B66', roughness: 0.75 });

    const root = new THREE.Group();
    const scale = new THREE.Group(); scale.scale.setScalar(S);
    const totalW = W * n + o.gap * (n - 1);
    texs.forEach((tex, i) => {
      tex.anisotropy = aniso;
      const wv = weave.clone(); wv.needsUpdate = true;
      wv.repeat.set((W + D * 2) / 6, (H + D * 2) / 6); // ~0.75mm/sợi
      const mat = new THREE.MeshPhysicalMaterial({ map: tex, bumpMap: wv, bumpScale: 0.9, roughness: 0.62, sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color('#ffffff'), clearcoat: 0.12, clearcoatRoughness: 0.55 });
      const p = panelMesh(W, H, D, mat, backMat, woodMat);
      p.position.x = -totalW / 2 + W / 2 + i * (W + o.gap);
      scale.add(p);
    });

    // treo cách tường 1 chút (móc treo), tường = mặt nhận bóng; thêm bóng đổ mềm lệch phải-dưới
    const gapWall = 6;
    scale.position.z = gapWall * S;
    const lift = Math.max(Math.max(W, H) * 0.7, totalW * 0.6); // sàn nằm ngoài khung nhìn
    // tường thật (đục, nhận bóng) phủ kín khung nhìn khi lắc ±góc → tranh treo tường, không phải đứng trên sàn
    const wallW = Math.max(totalW * 4.5, Math.max(W, H) * 3.2), wallH = lift + H * 2.2;
    const wallTex = (() => {
      // tường sơn nhám nhẹ + loang sáng từ trên trái như đèn phòng
      const c = document.createElement('canvas'); c.width = 512; c.height = 512;
      const x = c.getContext('2d')!;
      const gr = x.createRadialGradient(170, 120, 20, 230, 220, 520);
      gr.addColorStop(0, '#F6F3EE'); gr.addColorStop(1, '#E2DCD2');
      x.fillStyle = gr; x.fillRect(0, 0, 512, 512);
      const id = x.getImageData(0, 0, 512, 512);
      let sd = 3; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      for (let i = 0; i < id.data.length; i += 4) { const k = (r() - 0.5) * 7; id.data[i] += k; id.data[i + 1] += k; id.data[i + 2] += k; }
      x.putImageData(id, 0, 0);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(wallW * S, wallH * S), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.96, metalness: 0 }));
    wall.position.set(0, (wallH / 2 - lift) * S, 0);
    wall.receiveShadow = true;
    const PW = 1.22, PH = 1.18;
    const sc = document.createElement('canvas'); sc.width = 256; sc.height = Math.max(64, Math.round(256 * (H * PH) / (totalW * PW)));
    const sx = sc.getContext('2d')!;
    sx.filter = 'blur(9px)'; sx.fillStyle = 'rgba(40,30,20,0.75)';
    const mx = (sc.width - sc.width / PW) / 2, my = (sc.height - sc.height / PH) / 2;
    if (n === 1) sx.fillRect(mx, my, sc.width - mx * 2, sc.height - my * 2);
    else for (let i = 0; i < n; i++) {
      const w0 = (sc.width - mx * 2) * (W / totalW), step = (sc.width - mx * 2) * ((W + o.gap) / totalW);
      sx.fillRect(mx + i * step, my, w0, sc.height - my * 2);
    }
    const drop = new THREE.Mesh(new THREE.PlaneGeometry(totalW * PW * S, H * PH * S), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, opacity: 0.36, depthWrite: false }));
    drop.position.set((D * 0.9 + totalW * 0.012) * S, (H / 2 - D * 1.6) * S, 0.3 * S); // lệch phải-dưới theo độ dày khung

    const hang = new THREE.Group();
    hang.add(scale, wall, drop);
    hang.position.y = lift * S;
    root.add(hang);
    // khung nhìn bám theo TRANH (không theo mảng tường lớn phía sau): zoom = bán kính cả cảnh / bán kính tranh
    root.updateMatrixWorld(true);
    const all = new THREE.Box3().setFromObject(root);
    const art = new THREE.Box3().setFromObject(scale);
    const rAll = all.getBoundingSphere(new THREE.Sphere()).radius, rArt = art.getBoundingSphere(new THREE.Sphere()).radius;
    const zoom = (rAll / rArt) * (n > 1 ? 1.22 : W > H ? 1.08 : 0.92);
    const aim = ((art.min.y + art.max.y) / 2 - all.min.y) / (all.max.y - all.min.y);
    return { group: root, view: { az: 0.42, el: 0.1 }, aim, zoom, blob: 0, swing: 0.6 };
  };
}
