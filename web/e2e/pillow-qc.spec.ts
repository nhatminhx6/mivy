import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Gối in hình: mọi mẫu × mọi khổ (vuông, chữ nhật, tròn, gối ôm), 2 mặt — chữ nằm trong vùng an toàn (cách đường may
// ≥15mm, gối tròn nằm trong vòng tròn), không chồng nhau, không quá nhỏ; ảnh khách vào đúng ô; đếm ngày cặp đôi đúng;
// file in 2 trang + SVG outline có nét may; ảnh 3D dựng được; không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'pillow');

type Box = { t: string; x0: number; y0: number; x1: number; y1: number; fs: number; rot: boolean };
async function audit(page: Page, sel: string) {
  return page.locator(sel).evaluate((svg: SVGSVGElement) => {
    const vb = svg.viewBox.baseVal;
    const inv = svg.getCTM()!.inverse();
    const out: Box[] = [];
    svg.querySelectorAll('text').forEach((t) => {
      const txt = (t.textContent || '').trim();
      if (!txt) return;
      const b = (t as SVGTextElement).getBBox();
      const m = inv.multiply((t as SVGTextElement).getCTM()!);
      const pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].map(([x, y]) => {
        const p = svg.createSVGPoint(); p.x = x; p.y = y; const q = p.matrixTransform(m); return [q.x, q.y];
      });
      out.push({ t: txt, x0: Math.min(...pts.map((p) => p[0])), y0: Math.min(...pts.map((p) => p[1])), x1: Math.max(...pts.map((p) => p[0])), y1: Math.max(...pts.map((p) => p[1])), fs: parseFloat(t.getAttribute('font-size') || '0'), rot: !!t.getAttribute('transform') });
    });
    return { boxes: out, vb: { x: vb.x, y: vb.y, w: vb.width, h: vb.height } };
  });
}

function check(label: string, r: Awaited<ReturnType<typeof audit>>, W: number, H: number, round: boolean) {
  const SAFE = 15; // ≥1.5cm trong đường may
  for (const b of r.boxes) {
    // bbox SVG gồm cả khoảng ascent/descent của font → co 18% chiều cao cho sát nét chữ thật
    const pad = (b.y1 - b.y0) * 0.18;
    const x0 = b.x0, x1 = b.x1, y0 = b.y0 + pad, y1 = b.y1 - pad;
    if (round) {
      const R = W / 2 - SAFE;
      for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) {
        expect(Math.hypot(x - W / 2, y - H / 2), `${label}: "${b.t}" lòi khỏi vòng tròn an toàn`).toBeLessThanOrEqual(R + 0.5);
      }
    } else {
      expect(x0, `${label}: "${b.t}" sát mép trái`).toBeGreaterThanOrEqual(SAFE - 0.5);
      expect(x1, `${label}: "${b.t}" sát mép phải`).toBeLessThanOrEqual(W - SAFE + 0.5);
      expect(y0, `${label}: "${b.t}" sát mép trên`).toBeGreaterThanOrEqual(SAFE - 0.5);
      expect(y1, `${label}: "${b.t}" sát mép dưới`).toBeLessThanOrEqual(H - SAFE + 0.5);
    }
    if (b.t !== '“' && b.t !== '♥' && !b.rot) expect(b.fs, `${label}: "${b.t}" chữ quá nhỏ`).toBeGreaterThanOrEqual(4.5); // ≥4.5mm ≈ chữ 13pt, đọc rõ trên gối
  }
  // không chồng nhau (bỏ chữ xoay quanh logo + dấu ngoặc trang trí)
  const bs = r.boxes.filter((b) => !b.rot && b.t !== '“' && b.t !== '♥').map((b) => ({ ...b, y0: b.y0 + (b.y1 - b.y0) * 0.22, y1: b.y1 - (b.y1 - b.y0) * 0.22 }));
  for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
    const a = bs[i], c = bs[j];
    const ox = Math.min(a.x1, c.x1) - Math.max(a.x0, c.x0), oy = Math.min(a.y1, c.y1) - Math.max(a.y0, c.y0);
    expect(ox > 1 && oy > 1, `${label}: "${a.t}" chồng lên "${c.t}"`).toBe(false);
  }
}

test('Gối in hình: mọi mẫu × khổ, 2 mặt, ảnh, đếm ngày, file in, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/pillow');
  const tpls = page.getByTestId('pw-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  await page.getByTestId('tab-flat').click();

  const sizes = [{ t: 'Vuông 40×40', W: 400, H: 400, round: false }, { t: 'Vuông 45×45', W: 450, H: 450, round: false }, { t: 'Chữ nhật 30×50', W: 500, H: 300, round: false }, { t: 'Tròn Ø40', W: 400, H: 400, round: true }, { t: 'Gối ôm 40×100', W: 1000, H: 400, round: false }];
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(12);
  for (const sz of sizes) {
    await page.getByTestId('pw-sizes').locator('button', { hasText: sz.t }).click();
    for (let i = 0; i < n; i++) {
      await tpls.nth(i).click();
      await page.waitForTimeout(60);
      for (const face of ['front', 'back-face'] as const) {
        const r = await audit(page, `[data-testid="pw-${face}"] svg`);
        check(`${sz.t} mẫu ${i} ${face}`, r, sz.W, sz.H, sz.round);
      }
      if (sz.t.startsWith('Vuông 40') || sz.round || sz.W === 1000) {
        await page.getByTestId('pw-flat').screenshot({ path: path.join(OUT, `pw-${sz.W}x${sz.H}${sz.round ? 'r' : ''}-${String(i).padStart(2, '0')}.png`) });
      }
    }
  }

  // nội dung dài vẫn gọn (vuông 40 + gối ôm)
  for (const st of ['Vuông 40×40', 'Gối ôm 40×100', 'Tròn Ø40']) {
    await page.getByTestId('pw-sizes').locator('button', { hasText: st }).click();
    for (let i = 0; i < n; i++) {
      await tpls.nth(i).click();
      for (const k of ['title', 'name', 'name2', 'sub', 'backText']) {
        const inp = page.getByTestId(`pw-${k}`);
        if (await inp.count()) await inp.fill(k === 'title' ? 'Chúc mừng sinh nhật người thương yêu nhất của cả nhà mình' : k === 'sub' ? 'Cảm ơn vì đã luôn ở bên cạnh nhau trong mọi khoảnh khắc' : k === 'backText' ? 'Mãi yêu thương nhau nhé người ơi' : 'Nguyễn Hoàng Bảo Ngọc');
      }
      await page.waitForTimeout(60);
      const W = st.startsWith('Gối') ? 1000 : 400;
      for (const face of ['front', 'back-face'] as const) check(`dài ${st} mẫu ${i} ${face}`, await audit(page, `[data-testid="pw-${face}"] svg`), W, 400, st.startsWith('Tròn'));
    }
  }
  await page.getByTestId('pw-flat').screenshot({ path: path.join(OUT, 'pw-chu-dai.png') });

  // ảnh khách vào ô + zoom
  await page.getByTestId('pw-sizes').locator('button', { hasText: 'Vuông 40×40' }).click();
  await tpls.nth(2).click(); // cặp đôi
  const img = path.join(__dirname, '..', 'public', 'sample-products', '01-tshirt.png');
  await page.getByTestId('pw-photo-p1').setInputFiles(img);
  await page.getByTestId('pw-photo-p2').setInputFiles(img);
  await expect(page.locator('[data-testid="pw-front"] [data-photo-slot="p1"] image')).toHaveCount(1, { timeout: 10_000 });
  await expect(page.locator('[data-testid="pw-front"] [data-photo-slot="p2"] image')).toHaveCount(1);
  await page.getByTestId('pw-zoom-p1').fill('2');
  const w = await page.locator('[data-testid="pw-front"] [data-photo-slot="p1"] image').getAttribute('width');
  expect(Number(w)).toBeGreaterThan(150);
  // đếm ngày bên nhau
  await page.getByTestId('pw-date').fill('2020-01-01');
  const days = Math.round((new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime() - new Date(2020, 0, 1).getTime()) / 86400000);
  await expect(page.locator('[data-testid="pw-front"] svg')).toContainText(days.toLocaleString('vi-VN'));
  await page.getByTestId('pw-flat').screenshot({ path: path.join(OUT, 'pw-anh-khach.png') });

  // tải file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdf = fs.readFileSync(await grab('pw-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(2);
  const svg = fs.readFileSync(await grab('pw-svg'), 'utf8');
  expect(svg).not.toContain('<text');
  expect(svg).toContain('stroke-dasharray');
  const png = fs.readFileSync(await grab('pw-png'));
  expect(png.readUInt32BE(16)).toBe(1600);

  // 3D
  await page.getByTestId('tab-3d').click();
  for (const st of ['Vuông 40×40', 'Tròn Ø40', 'Gối ôm 40×100']) {
    await page.getByTestId('pw-sizes').locator('button', { hasText: st }).click();
    const url = await page.evaluate(async () => await (window as unknown as { __pwSnap: (w: number, h: number) => Promise<string> }).__pwSnap(1200, 900));
    expect(url.length).toBeGreaterThan(20_000);
    fs.writeFileSync(path.join(OUT, `pw-3d-${st.split(' ')[0]}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  const p3 = fs.readFileSync(await grab('pw-3d'));
  expect(p3.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
