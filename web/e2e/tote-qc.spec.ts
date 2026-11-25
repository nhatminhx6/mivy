import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Túi vải canvas: mọi mẫu × mọi khổ — hình/chữ nằm trong vùng in, in lụa đúng số màu, film tách màu,
// logo khách (1 màu khi in lụa), mặt sau, tải PDF (đủ trang) / PNG / SVG (outline) / ảnh 3D, không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'tote');

async function audit(page: Page, label: string) {
  return page.locator('[data-testid="tt-print-front"] svg').evaluate((svg: SVGSVGElement, lb: string) => {
    const vb = svg.viewBox.baseVal;
    const r = svg.getBoundingClientRect();
    const k = vb.width / r.width;
    const skip = (el: Element) => !!el.closest('defs, mask, clipPath, [clip-path]');
    const bad: string[] = [];
    const colors = new Set<string>();
    let texts = 0;
    svg.querySelectorAll('text, path, circle, ellipse, rect, line, image').forEach((el) => {
      if (skip(el)) return;
      if (el.tagName === 'text') texts++;
      for (const a of ['fill', 'stroke']) {
        const v = el.getAttribute(a);
        if (v && v !== 'none' && !el.closest('[data-tint]') && !el.hasAttribute('data-tint')) colors.add(v.toLowerCase());
      }
      const b = el.getBoundingClientRect();
      if (b.width === 0 && b.height === 0) return;
      const x0 = (b.left - r.left) * k + vb.x, y0 = (b.top - r.top) * k + vb.y;
      const x1 = x0 + b.width * k, y1 = y0 + b.height * k;
      const tol = 1.2;
      if (x0 < -tol || y0 < -tol || x1 > vb.width + tol || y1 > vb.height + tol) bad.push(`${el.tagName}"${(el.textContent || '').slice(0, 24)}" [${x0.toFixed(1)},${y0.toFixed(1)},${x1.toFixed(1)},${y1.toFixed(1)}] ngoài ${vb.width}×${vb.height}`);
    });
    return { lb, bad, colors: [...colors], texts, w: vb.width, h: vb.height };
  }, label);
}

test('túi vải: mọi mẫu × khổ, số màu in lụa, film, logo, mặt sau, tải file, 3D', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/tote');
  const tpls = page.getByTestId('tt-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('mockup-3d').locator('canvas')).toHaveCount(1, { timeout: 30_000 });

  const sizes = page.getByTestId('tt-size');
  const nT = await tpls.count();
  expect(nT).toBeGreaterThanOrEqual(10);
  await page.getByTestId('tab-flat').click();
  const flat = page.getByTestId('tt-flat');
  for (let i = 0; i < nT; i++) {
    await tpls.nth(i).click();
    for (let z = 0; z < await sizes.count(); z++) {
      await sizes.nth(z).click();
      await page.waitForTimeout(120);
      const r = await audit(page, `mẫu ${i} khổ ${z}`);
      expect(r.bad, `${r.lb}: hình/chữ lòi khỏi vùng in`).toEqual([]);
      expect(r.texts, `${r.lb}: có chữ`).toBeGreaterThan(2);
      // in lụa: số màu ≤ số màu đã chọn và đúng các màu mực đang dùng
      const used = (await page.getByTestId('tt-used').innerText()).match(/#[0-9A-F]{6}/gi)!.map((c) => c.toLowerCase());
      expect(r.colors.every((c) => used.includes(c)), `${r.lb}: màu lạ ${r.colors} ∉ ${used}`).toBe(true);
      expect(r.colors.length).toBeLessThanOrEqual(used.length);
      if (z === 1) await flat.screenshot({ path: path.join(OUT, `tote-${String(i + 1).padStart(2, '0')}.png`) });
    }
  }

  // số màu in lụa 1/2/3 trên mẫu 3 màu (tiệm sách) + film tách màu
  await tpls.nth(7).click();
  for (const n of [1, 2, 3]) {
    await page.getByTestId(`tt-nink-${n}`).click();
    await page.waitForTimeout(150);
    const r = await audit(page, `${n} màu`);
    expect(r.colors.length, `${n} màu: đếm màu`).toBe(n);
    const seps = await page.locator('[data-testid="tt-seps"] svg[data-side="front"]').evaluateAll((els) => els.map((s) => {
      const cs = new Set<string>(); let n2 = 0;
      s.querySelectorAll('[data-ink] text, [data-ink] path, [data-ink] circle, [data-ink] ellipse, [data-ink] rect, [data-ink] line').forEach((e) => {
        if (e.closest('defs, mask')) return; n2++;
        for (const a of ['fill', 'stroke']) { const v = e.getAttribute(a); if (v && v !== 'none') cs.add(v.toLowerCase()); }
      });
      return { n: n2, colors: [...cs] };
    }));
    expect(seps.length, `${n} màu: số film`).toBe(n);
    for (const s of seps) { expect(s.n).toBeGreaterThan(0); expect(s.colors).toEqual(['#000000']); }
  }

  // DTF: có lớp nền mờ (mẫu logo), không film
  await tpls.nth(0).click();
  await page.getByTestId('tt-method-dtf').click();
  await expect(page.locator('[data-testid="tt-print-front"] [data-tint]')).toHaveCount(1);
  await expect(page.locator('[data-testid="tt-seps"] svg')).toHaveCount(0);
  await page.getByTestId('tt-method-screen').click();
  await page.getByTestId('tt-nink-2').click();

  // logo khách: in lụa → lọc 1 màu
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = c.height = 200;
    const x = c.getContext('2d')!; x.fillStyle = '#1b3a6b'; x.beginPath(); x.arc(100, 100, 80, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#fff'; x.font = 'bold 90px sans-serif'; x.textAlign = 'center'; x.fillText('Q', 100, 132);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.getByTestId('tt-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  const img = page.locator('[data-testid="tt-print-front"] svg image');
  await expect(img).toHaveCount(1);
  expect(await img.getAttribute('filter')).toMatch(/url\(#ttink/);
  const lr = await audit(page, 'có logo');
  expect(lr.bad).toEqual([]);
  await flat.screenshot({ path: path.join(OUT, 'tote-logo.png') });

  // chữ dài vẫn nằm trong vùng in
  await page.getByTestId('tt-title').fill('Cà phê rang mộc nguyên chất từ cao nguyên Lâm Đồng mỗi sáng');
  await page.getByTestId('tt-subtitle').fill('Est. 2024 · Sài Gòn · Đà Lạt · Hà Nội');
  await page.waitForTimeout(150);
  expect((await audit(page, 'chữ dài')).bad).toEqual([]);

  // mặt sau (khổ 35×40 → vùng in 240×280mm)
  await sizes.nth(1).click();
  await page.getByTestId('tt-back').check();
  await expect(page.locator('[data-testid="tt-print-back"] svg text').first()).toBeAttached();
  await expect(page.locator('[data-testid="tt-seps"] svg')).toHaveCount(4);

  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  // PDF: mỗi mặt = xem màu + file in + 2 film → 8 trang
  const pdf = fs.readFileSync(await grab('tt-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length).toBe(8);
  const p = fs.readFileSync(await grab('tt-png'));
  expect(p.readUInt32BE(16)).toBe(Math.round((240 / 25.4) * 200));
  const svg = fs.readFileSync(await grab('tt-svg'), 'utf8');
  expect(svg).toContain('viewBox="0 0 240 280"');
  expect(svg).not.toContain('<text');

  // 3D: đổi đáy + tải ảnh 3D
  await page.getByTestId('tab-3d').click();
  await expect(page.getByTestId('mockup-3d').locator('canvas')).toHaveCount(1, { timeout: 30_000 });
  for (const gi of [1, 2, 0]) { await page.getByTestId('tt-gusset').nth(gi).click(); await page.waitForTimeout(700); }
  const p3 = fs.readFileSync(await grab('tt-3d'));
  expect(p3.readUInt32BE(16)).toBe(1600);
  await page.getByTestId('mockup-3d').screenshot({ path: path.join(OUT, 'tote-3d.png') });
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
