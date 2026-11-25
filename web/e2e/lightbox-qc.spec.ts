import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Hộp đèn: mọi loại × mẫu × khổ (+ mặt sau "dịch vụ") — chữ nằm trong mặt đèn (mặt tròn: lọt vòng tròn),
// không chồng nhau, đủ lớn để đọc từ xa; chữ dài vẫn gọn; logo; file in (PDF đúng số mặt, SVG outline + CutContour,
// zip 2 mặt), PNG, ảnh 3D; chụp 3D cả 3 loại; không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'lightbox');

async function audit(page: Page, sel: string, label: string) {
  const r = await page.evaluate((sel) => {
    const svg = document.querySelector(`${sel} svg`) as SVGSVGElement;
    const vb = svg.viewBox.baseVal;
    const W = vb.width, H = vb.height;
    const round = !!svg.querySelector('clipPath circle') && Math.abs(W - H) < 0.5;
    const texts = Array.from(svg.querySelectorAll('text[data-lb-text]')) as SVGTextElement[];
    const boxes = texts.filter((t) => (t.textContent || '').trim()).map((t) => {
      const b = t.getBBox(); const fs = +(t.getAttribute('font-size') || 0); const by = +(t.getAttribute('y') || 0);
      return { key: t.getAttribute('data-lb-text')!, size: +(t.getAttribute('data-lb-size') || fs), x: b.x, w: b.width, y1: by - fs * 0.78, y2: by + fs * 0.1, txt: t.textContent || '' };
    });
    const bad: string[] = [];
    for (const b of boxes) {
      if (round) {
        const cx = W / 2, cy = H / 2, r = W / 2;
        for (const [x, y] of [[b.x, b.y1], [b.x + b.w, b.y1], [b.x, b.y2], [b.x + b.w, b.y2]]) {
          if (Math.hypot(x - cx, y - cy) > r - 2) { bad.push(`lòi vòng tròn: ${b.key} "${b.txt}"`); break; }
        }
      } else if (b.x < 2 || b.x + b.w > W - 2 || b.y1 < 2 || b.y2 > H - 2) bad.push(`tràn khổ: ${b.key} "${b.txt}"`);
    }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], c = boxes[j];
      if (a.x < c.x + c.w - 0.5 && c.x < a.x + a.w - 0.5 && a.y1 < c.y2 - 0.5 && c.y1 < a.y2 - 0.5) bad.push(`chồng: "${a.txt}" × "${c.txt}"`);
    }
    const minSize = Math.min(...boxes.map((b) => b.size));
    return { bad, minSize, n: boxes.length, M: Math.min(W, H), keys: boxes.map((b) => b.key) };
  }, sel);
  expect(r.bad, `${label}: ${r.bad.join(' | ')}`).toEqual([]);
  expect(r.n, `${label}: có chữ`).toBeGreaterThan(1);
  // hộp đèn nhìn xa: chữ nhỏ nhất ≥ 2% cạnh ngắn (Ø40 → 8mm), kể cả khi khách gõ rất dài
  expect(r.minSize, `${label}: chữ quá nhỏ ${r.minSize}`).toBeGreaterThan(r.M * 0.02);
  return r;
}

test('Hộp đèn: mọi loại × mẫu × khổ, file in, 3D', async ({ page }) => {
  test.setTimeout(900_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/lightbox');
  await expect(page.getByTestId('lx-tpl').first()).toBeVisible({ timeout: 120_000 });
  await page.getByTestId('tab-flat').click();

  let checked = 0;
  for (const kind of ['round', 'wall', 'stand']) {
    await page.getByTestId(`lx-kind-${kind}`).click();
    await page.waitForTimeout(300);
    const tpls = page.getByTestId('lx-tpl');
    const nt = await tpls.count();
    expect(nt).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < nt; i++) {
      await tpls.nth(i).click();
      const sizes = page.getByTestId('lx-size');
      for (let z = 0; z < await sizes.count(); z++) {
        await sizes.nth(z).click();
        await page.waitForTimeout(60);
        await audit(page, '[data-testid="lx-preview"]', `${kind} mẫu ${i} khổ ${z}`);
        checked++;
      }
      if (kind !== 'wall') {
        await page.getByTestId('lx-back-info').click(); await page.waitForTimeout(60);
        await audit(page, '[data-testid="lx-preview-back"]', `${kind} mẫu ${i} mặt sau`);
        await page.getByTestId('lx-back-same').click();
      }
      await page.locator('[data-testid="lx-preview"]').locator('..').screenshot({ path: path.join(OUT, `${kind}-${i}.png`) });
    }
  }
  expect(checked).toBeGreaterThanOrEqual(30);

  // chữ dài + logo: vẫn lọt mặt đèn
  const long = { brand: 'Nhà hàng Hương Quê Gia Khánh', category: 'Cà phê rang xay & trà sữa', tagline: 'Rang xay nguyên chất mỗi sáng, giao tận nơi trong 30 phút', hotline: '0909 123 456 · 028 3822 1234', extra: 'Mở cửa 6:00 – 22:00 mỗi ngày\nWifi miễn phí · Chỗ đậu xe rộng\nNhận tiệc sinh nhật · công ty\nGiao hàng tận nơi' };
  for (const kind of ['round', 'wall', 'stand']) {
    await page.getByTestId(`lx-kind-${kind}`).click(); await page.waitForTimeout(200);
    for (const [k, v] of Object.entries(long)) { const el = page.getByTestId(`lx-${k}`); if (await el.count()) await el.fill(v); }
    const tpls = page.getByTestId('lx-tpl');
    for (let i = 0; i < await tpls.count(); i++) {
      await tpls.nth(i).click(); await page.waitForTimeout(60);
      await audit(page, '[data-testid="lx-preview"]', `${kind} chữ dài mẫu ${i}`);
      if (kind !== 'wall') {
        await page.getByTestId('lx-back-info').click(); await page.waitForTimeout(60);
        await audit(page, '[data-testid="lx-preview-back"]', `${kind} chữ dài mặt sau ${i}`);
        await page.getByTestId('lx-back-same').click();
      }
    }
  }
  await page.locator('[data-testid="lx-preview"]').locator('..').screenshot({ path: path.join(OUT, 'chu-dai-stand.png') });

  // logo khách
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAKklEQVR42mNkYPhfz0AEYBxVSF+FjP8ZGBhIUsjIyMhAkkJGRkZGBkoUAgAk2hQRnU6ktgAAAABJRU5ErkJggg==', 'base64');
  await page.getByTestId('lx-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('[data-testid="lx-preview"] image[data-lb-logo]')).toHaveCount(1, { timeout: 10_000 });

  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  // hộp đèn đứng (2 mặt): PDF 2 trang, SVG zip
  await page.getByTestId('lx-kind-stand').click(); await page.waitForTimeout(300);
  const pdf2 = fs.readFileSync(await grab('lx-pdf'));
  expect(pdf2.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf2.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(2);
  const zip = fs.readFileSync(await grab('lx-svg'));
  expect(zip.subarray(0, 2).toString()).toBe('PK');
  expect(zip.toString('latin1')).toContain('CutContour');
  // gắn tường (1 mặt): PDF 1 trang, SVG outline + CutContour, đúng khổ mm
  await page.getByTestId('lx-kind-wall').click(); await page.waitForTimeout(300);
  const pdf1 = fs.readFileSync(await grab('lx-pdf'));
  expect((pdf1.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(1);
  const svg = fs.readFileSync(await grab('lx-svg'), 'utf8');
  expect(svg).toContain('id="CutContour"');
  expect(svg).toMatch(/width="(610|810|1010|1210)mm"/);
  expect((svg.match(/<text/g) || []).length).toBe(0);
  const pngFile = fs.readFileSync(await grab('lx-png'));
  expect(pngFile.readUInt32BE(16)).toBe(1600);

  // 3D: cả 3 loại chụp được, ảnh 3D tải về 1600px
  await page.getByTestId('tab-3d').click();
  for (const kind of ['round', 'wall', 'stand']) {
    await page.getByTestId(`lx-kind-${kind}`).click(); await page.waitForTimeout(300);
    await page.waitForFunction(() => !!(window as unknown as { __lbxSnap?: unknown }).__lbxSnap);
    const url = await page.evaluate(() => (window as unknown as { __lbxSnap: (w: number, h: number) => Promise<string> }).__lbxSnap(1200, 900));
    expect(url.length).toBeGreaterThan(50_000);
    fs.writeFileSync(path.join(OUT, `3d-${kind}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1500);
  const p3d = fs.readFileSync(await grab('lx-3d-png'));
  expect(p3d.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
