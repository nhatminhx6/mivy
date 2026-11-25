import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Banner hiflex + Backdrop: mọi mẫu × mọi khổ (ngang dài, dọc, backdrop) — chữ nằm gọn trong khổ, không đè nhau,
// có ảnh khách vẫn gọn; tải PNG / PDF in / SVG outline / ảnh 3D; khung 3D dựng được cho cả 2 loại.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'banner');
fs.mkdirSync(OUT, { recursive: true });

async function audit(page: Page, label: string) {
  const r = await page.evaluate(async () => {
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    const svg = document.querySelector('[data-testid="bn-preview"] svg') as SVGSVGElement;
    const vb = svg.viewBox.baseVal;
    const texts = [...svg.querySelectorAll('text')].filter((t) => !t.closest('[data-deco]') && (t.textContent || '').trim());
    const tol = Math.min(vb.width, vb.height) * 0.004;
    // hộp MỰC thật của chữ (đo bằng font thật), không dùng getBBox vì nó gồm cả khoảng ascent/descent rộng của font
    const ctx = document.createElement('canvas').getContext('2d')!;
    const boxes = texts.map((t) => {
      const b = t.getBBox();
      const fs = parseFloat(t.getAttribute('font-size') || '0');
      ctx.font = `${t.getAttribute('font-style') || ''} ${t.getAttribute('font-weight') || 400} ${fs}px ${t.getAttribute('font-family')}`;
      const m = ctx.measureText(t.textContent || '');
      const base = parseFloat(t.getAttribute('y') || '0');
      return { s: t.textContent!, x: b.x, y: base - m.actualBoundingBoxAscent, w: b.width, h: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent };
    });
    const out = boxes.filter((b) => b.x < vb.x - tol || b.y < vb.y - tol || b.x + b.w > vb.x + vb.width + tol || b.y + b.h > vb.y + vb.height + tol).map((b) => b.s);
    const overlaps: string[] = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
      const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
      if ((ix * iy) / Math.max(1, Math.min(a.w * a.h, b.w * b.h)) > 0.04) overlaps.push(`${a.s} ⨯ ${b.s}`);
    }
    // chữ nhỏ nhất vẫn đọc được: ≥ 1.1% cạnh ngắn của khổ
    const minFs = Math.min(...texts.map((t) => parseFloat(t.getAttribute('font-size') || '0')));
    return { n: texts.length, out, overlaps, minFs, short: Math.min(vb.width, vb.height) };
  });
  expect(r.n, `${label}: có chữ`).toBeGreaterThanOrEqual(3);
  expect(r.out, `${label}: chữ lòi khỏi khổ`).toEqual([]);
  expect(r.overlaps, `${label}: chữ đè nhau`).toEqual([]);
  expect(r.minFs, `${label}: chữ quá nhỏ`).toBeGreaterThan(r.short * 0.011);
}

test('banner/backdrop: mọi mẫu × mọi khổ — chữ gọn, không đè', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/banner');
  await expect(page.getByTestId('bn-tpl').first()).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('tab-flat').click();
  const kinds = page.getByTestId('bn-kind');
  const tpls = page.getByTestId('bn-tpl');
  let n = 0;
  for (let k = 0; k < await kinds.count(); k++) {
    await kinds.nth(k).click();
    const sizes = page.getByTestId('bn-size');
    for (let s = 0; s < await sizes.count(); s++) {
      await sizes.nth(s).click();
      const sz = (await sizes.nth(s).innerText()).replace(/[^\dx×]/g, '');
      for (let i = 0; i < await tpls.count(); i++) {
        await tpls.nth(i).click();
        await audit(page, `loại ${k} khổ ${sz} mẫu ${i}`);
        if (i % 3 === 0) await page.getByTestId('bn-preview').screenshot({ path: path.join(OUT, `k${k}-s${s}-t${String(i).padStart(2, '0')}.png`) });
        n++;
      }
    }
  }
  expect(n).toBeGreaterThanOrEqual(14 * 7);
  expect(errors).toEqual([]);
});

test('banner: có ảnh khách + nội dung dài vẫn gọn', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/banner');
  await expect(page.getByTestId('bn-tpl').first()).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('tab-flat').click();
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 900; c.height = 600;
    const x = c.getContext('2d')!; const g = x.createLinearGradient(0, 0, 900, 600); g.addColorStop(0, '#E6A57E'); g.addColorStop(1, '#5B3A29');
    x.fillStyle = g; x.fillRect(0, 0, 900, 600); x.fillStyle = '#fff'; x.beginPath(); x.arc(450, 300, 160, 0, 7); x.fill();
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.getByTestId('bn-photo').setInputFiles({ name: 'anh.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.locator('[data-testid="bn-preview"] svg image')).toHaveCount(1, { timeout: 10_000 });
  const kinds = page.getByTestId('bn-kind');
  const tpls = page.getByTestId('bn-tpl');
  for (let k = 0; k < 2; k++) {
    await kinds.nth(k).click();
    const sizes = page.getByTestId('bn-size');
    for (const s of [0, k === 0 ? 3 : 2]) {
      await sizes.nth(s).click();
      for (let i = 0; i < await tpls.count(); i++) {
        await tpls.nth(i).click();
        await expect(page.locator('[data-testid="bn-preview"] svg image')).toHaveCount(1);
        await audit(page, `ảnh · loại ${k} khổ ${s} mẫu ${i}`);
        if (i % 4 === 1) await page.getByTestId('bn-preview').screenshot({ path: path.join(OUT, `photo-k${k}-s${s}-t${i}.png`) });
      }
    }
  }
  // nội dung dài
  await kinds.nth(0).click(); await page.getByTestId('bn-size').nth(0).click(); await tpls.nth(2).click();
  await page.getByTestId('bn-title').fill('Xả kho cuối năm toàn bộ quần áo, giày dép, túi xách, phụ kiện thời trang');
  await page.getByTestId('bn-subtitle').fill('Mua 2 tặng 1 – áp dụng mọi sản phẩm, đổi trả trong 7 ngày, giao hàng miễn phí nội thành');
  await audit(page, 'chữ dài');
  await page.getByTestId('bn-preview').screenshot({ path: path.join(OUT, 'long-text.png') });
});

test('banner: tải file in + ảnh 3D, khung 3D dựng được', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/banner');
  await expect(page.getByTestId('bn-tpl').first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText('Kéo để xoay')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText('chưa hỗ trợ xem 3D')).toHaveCount(0);
  await page.getByTestId('mockup-3d').screenshot({ path: path.join(OUT, '3d-banner.png') });
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 150_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const shot = fs.readFileSync(await grab('bn-3dpng'));
  expect(shot.readUInt32BE(16)).toBe(1600);
  const png = fs.readFileSync(await grab('bn-png'));
  expect(png.readUInt32BE(16)).toBe(2400);
  const svgP = await grab('bn-svg');
  expect(svgP).toMatch(/300x80cm-file-in\.svg$/);
  const svg = fs.readFileSync(svgP, 'utf8');
  expect(svg).toContain('<path');
  expect(svg).toMatch(/viewBox="-20 -20 3040 840"/);
  const pdf = fs.readFileSync(await grab('bn-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  // backdrop: khung sắt 3D
  await page.getByTestId('bn-kind').nth(1).click();
  await page.waitForTimeout(3000);
  await expect(page.getByText('chưa hỗ trợ xem 3D')).toHaveCount(0);
  await page.getByTestId('mockup-3d').screenshot({ path: path.join(OUT, '3d-backdrop.png') });
  await page.getByTestId('bn-tpl').nth(9).click(); // đám cưới
  await page.waitForTimeout(2500);
  const bd = fs.readFileSync(await grab('bn-3dpng'));
  expect(bd.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
