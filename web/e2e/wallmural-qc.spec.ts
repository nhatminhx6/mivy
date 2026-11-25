import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Tranh dán tường: mọi mẫu × khổ tường × (không cửa / cửa / cửa sổ) — chữ nằm trong tường, không đè nhau,
// không lọt vào vùng cửa; chia tấm ≤ khổ cuộn; PDF = 1 trang sơ đồ + n tấm; PNG; ảnh khách + cảnh báo dpi; 3D.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'wallmural');

async function audit(page: Page, label: string) {
  const r = await page.evaluate(() => {
    const svg = document.querySelector('svg[data-wm-mode="view"]') as SVGSVGElement;
    const vb = svg.viewBox.baseVal;
    const W = vb.width, H = vb.height;
    const obs = svg.querySelector('rect[stroke="#E0007A"]');
    const ob = obs ? (obs as SVGRectElement).getBBox() : null;
    const texts = Array.from(svg.querySelectorAll('text')).filter((t) => {
      const op = parseFloat(t.getAttribute('opacity') || '1');
      return op >= 0.5 && t.getAttribute('fill') !== '#B0005F' && (t.textContent || '').trim();
    }) as SVGTextElement[];
    const boxes = texts.map((t) => {
      const b = t.getBBox(); const ctm = t.getCTM()!, root = svg.getCTM()!;
      const m = root.inverse().multiply(ctm);
      const p1 = new DOMPoint(b.x, b.y).matrixTransform(m), p2 = new DOMPoint(b.x + b.width, b.y + b.height).matrixTransform(m);
      const x = Math.min(p1.x, p2.x), y = Math.min(p1.y, p2.y), w = Math.abs(p2.x - p1.x), h = Math.abs(p2.y - p1.y);
      return { s: t.textContent || '', x, y, w, h, fs: parseFloat(t.getAttribute('font-size') || '0') };
    });
    const out: string[] = [];
    for (const b of boxes) {
      if (b.x < -2 || b.y < -2 || b.x + b.w > W + 2 || b.y + b.h > H + 2) out.push(`ngoài tường: "${b.s}"`);
      if (b.fs < Math.min(W, H) * 0.005) out.push(`chữ quá nhỏ (${b.fs.toFixed(0)}mm): "${b.s}"`);
      if (ob) {
        const ix = Math.min(b.x + b.w, ob.x + ob.width) - Math.max(b.x, ob.x), iy = Math.min(b.y + b.h, ob.y + ob.height) - Math.max(b.y, ob.y);
        if (ix > b.w * 0.15 && iy > b.h * 0.3) out.push(`chữ lọt vùng cửa: "${b.s}"`);
      }
    }
    // chồng chữ: so 2 hộp đã thu nhỏ 30% chiều cao (bỏ phần trống trên/dưới của dòng)
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const ay = a.y + a.h * 0.2, ah = a.h * 0.6, by = b.y + b.h * 0.2, bh = b.h * 0.6;
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), iy = Math.min(ay + ah, by + bh) - Math.max(ay, by);
      if (ix > 2 && iy > 2) out.push(`chồng chữ: "${a.s}" × "${b.s}"`);
    }
    return { out, n: boxes.length };
  });
  expect(r.out, `${label}: ${r.out.join(' | ')}`).toEqual([]);
  expect(r.n, `${label}: có chữ`).toBeGreaterThan(0);
}

test('Tranh dán tường: mẫu × khổ × cửa, chia tấm, file in, ảnh, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/wallmural');
  const tpls = page.getByTestId('wm-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  const nT = await tpls.count();
  expect(nT).toBeGreaterThanOrEqual(10);

  const walls = page.getByTestId('wm-walls').locator('button');
  const obsModes = ['wm-obs-none', 'wm-obs-door', 'wm-obs-window'];
  for (let w = 0; w < await walls.count(); w++) {
    await walls.nth(w).click();
    for (const om of obsModes) {
      await page.getByTestId(om).click();
      for (let t = 0; t < nT; t++) {
        if (t === nT - 1 && om !== 'wm-obs-none') continue; // mẫu ảnh: chú thích ở góc, không né cửa
        await tpls.nth(t).click();
        await page.waitForTimeout(60);
        await audit(page, `khổ ${w} · ${om} · mẫu ${t}`);
      }
    }
  }

  // chia tấm: tấm ≤ khổ cuộn, đủ phủ tường + dư mép, đúng số tấm
  await walls.nth(2).click(); // 5 × 3 m
  await page.getByTestId('wm-obs-door').click();
  await tpls.nth(0).click();
  for (const roll of [0, 1, 2]) {
    await page.getByTestId('wm-rolls').locator('button').nth(roll).click();
    const info = await page.evaluate(() => {
      const n = Number(document.querySelector('[data-testid="wm-summary"]')!.getAttribute('data-panels'));
      const ws = Array.from(document.querySelectorAll('[data-testid="wm-print"] svg')).map((s) => parseFloat(s.getAttribute('width')!));
      const vbs = Array.from(document.querySelectorAll('[data-testid="wm-print"] svg')).map((s) => (s as SVGSVGElement).viewBox.baseVal);
      return { n, ws, xs: vbs.map((v) => [v.x, v.x + v.width]) };
    });
    const rollMm = [1060, 1200, 1370][roll];
    expect(info.ws.length).toBe(info.n);
    for (const w of info.ws) expect(w).toBeLessThanOrEqual(rollMm + 0.5);
    expect(info.xs[0][0]).toBeLessThanOrEqual(-29); // phủ dư mép trái
    expect(info.xs[info.xs.length - 1][1]).toBeGreaterThanOrEqual(5000 + 29); // phủ dư mép phải
    for (let i = 1; i < info.xs.length; i++) expect(info.xs[i - 1][1] - info.xs[i][0]).toBeGreaterThanOrEqual(19); // chồng mí
  }

  // nhập khổ tường tự do
  await page.getByTestId('wm-w').fill('620'); await page.getByTestId('wm-h').fill('290'); await page.getByTestId('wm-apply').click();
  await page.waitForTimeout(150);
  await audit(page, 'tường 6,2 × 2,9 m');

  // sửa chữ dài
  await tpls.nth(6).click(); // giá trị cốt lõi
  await page.getByTestId('wm-field-title').fill('GIÁ TRỊ CỐT LÕI CỦA CHÚNG TÔI TRONG HÀNH TRÌNH PHÁT TRIỂN');
  await page.getByTestId('wm-field-values').fill('Tận tâm phục vụ | Lắng nghe từng khách hàng, đặt họ ở trung tâm mọi quyết định của công ty\nSáng tạo | Luôn đổi mới\nChính trực | Minh bạch\nĐồng đội | Cùng nhau\nTrách nhiệm | Làm tới nơi tới chốn\nHọc hỏi | Mỗi ngày một tốt hơn');
  await page.waitForTimeout(150);
  await audit(page, 'giá trị 6 ý chữ dài');

  // tải file
  await walls.nth(1).click(); // 4 × 2,7
  await tpls.nth(2).click();
  const nPanels = Number(await page.getByTestId('wm-summary').getAttribute('data-panels'));
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 180_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdf = fs.readFileSync(await grab('wm-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  expect(pages).toBe(nPanels + 1);
  await page.getByTestId('tab-flat').click();
  const png = fs.readFileSync(await grab('wm-png'));
  expect(png.readUInt32BE(16)).toBe(2400);

  // ảnh khách nhỏ → cảnh báo dpi
  await tpls.nth(nT - 1).click();
  const small = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 400; c.height = 300; const x = c.getContext('2d')!; x.fillStyle = '#4a7'; x.fillRect(0, 0, 400, 300); x.fillStyle = '#fff'; x.fillRect(100, 80, 200, 140); return c.toDataURL('image/png'); });
  const imgPath = path.join(OUT, 'anh-nho.png'); fs.writeFileSync(imgPath, Buffer.from(small.split(',')[1], 'base64'));
  await page.getByTestId('wm-photo').setInputFiles(imgPath);
  await expect(page.getByTestId('wm-dpi-warn')).toBeVisible({ timeout: 10_000 });
  const dpi = Number(await page.getByTestId('wm-dpi').getAttribute('data-dpi'));
  expect(dpi).toBeLessThan(35);
  await page.screenshot({ path: path.join(OUT, 'anh-khach.png') });

  // 3D
  await page.getByTestId('tab-3d').click();
  for (const t of [0, 6]) {
    await tpls.nth(t).click();
    await page.waitForTimeout(400);
    const url = await page.evaluate(() => (window as unknown as { __wmSnap: (w: number, h: number) => Promise<string> }).__wmSnap(1200, 900));
    expect(url.length).toBeGreaterThan(20_000);
    fs.writeFileSync(path.join(OUT, `3d-${t}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
