import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Huy hiệu cài áo: mọi mẫu × mọi khổ — chữ nằm trong mặt huy hiệu (không lấn vòng gấp mép), không chữ thẳng nào
// đè nhau, cỡ chữ đủ đọc; tên dài tự xuống dòng; in hàng loạt 30 tên → đủ con/tờ; tờ in có CutContour, chữ đã outline;
// ảnh riêng; 3D đủ 4 kiểu mặt sau; không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'pin');
fs.mkdirSync(OUT, { recursive: true });

const SIZES = [{ d: 32 }, { d: 44 }, { d: 58 }, { d: 75 }];
const SAFE = 2.5;

async function audit(page: Page, label: string, d: number) {
  const r = await page.locator('[data-testid="pin-preview"] svg').evaluate((svg: SVGSVGElement) => {
    const inv = svg.getScreenCTM()!.inverse();
    const toUser = (el: SVGGraphicsElement, x: number, y: number) => new DOMPoint(x, y).matrixTransform(el.getScreenCTM()!).matrixTransform(inv);
    let maxR = 0, minSize = 99;
    const straight: { x0: number; y0: number; x1: number; y1: number; t: string }[] = [];
    svg.querySelectorAll('text').forEach((t) => {
      if (!(t.textContent || '').trim()) return;
      const b = (t as SVGTextElement).getBBox();
      // khung chữ theo chân/đỉnh chữ hoa (bỏ khoảng trống ascender/descender của font)
      const fs = parseFloat(t.getAttribute('font-size') || '0');
      const top = b.y + b.height * 0.18, bot = b.y + b.height * 0.86;
      const pts = [[b.x, top], [b.x + b.width, top], [b.x, bot], [b.x + b.width, bot]].map(([x, y]) => toUser(t as SVGGraphicsElement, x, y));
      for (const p of pts) maxR = Math.max(maxR, Math.hypot(p.x, p.y));
      minSize = Math.min(minSize, fs);
      if (!t.getAttribute('transform')) {
        straight.push({ x0: Math.min(...pts.map((p) => p.x)), x1: Math.max(...pts.map((p) => p.x)), y0: Math.min(...pts.map((p) => p.y)), y1: Math.max(...pts.map((p) => p.y)), t: t.textContent || '' });
      }
    });
    let overlap = '';
    for (let i = 0; i < straight.length; i++) for (let j = i + 1; j < straight.length; j++) {
      const a = straight[i], c = straight[j];
      const ox = Math.min(a.x1, c.x1) - Math.max(a.x0, c.x0), oy = Math.min(a.y1, c.y1) - Math.max(a.y0, c.y0);
      if (ox > 0.3 && oy > 0.3) overlap = `${a.t} ↔ ${c.t}`;
    }
    return { maxR, minSize, overlap, n: svg.querySelectorAll('text').length };
  });
  expect(r.n, `${label}: có chữ`).toBeGreaterThan(0);
  expect(r.maxR, `${label}: chữ lấn ra ngoài mặt huy hiệu (r=${r.maxR.toFixed(2)})`).toBeLessThanOrEqual(d / 2 - SAFE + 1.2);
  expect(r.minSize, `${label}: chữ quá nhỏ`).toBeGreaterThanOrEqual(1.2);
  expect(r.overlap, `${label}: chữ đè nhau`).toBe('');
}

test('Huy hiệu cài áo: mọi mẫu × khổ, hàng loạt tên, file in–cắt, 3D', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/pin');
  const tpls = page.getByTestId('pin-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  const nT = await tpls.count();
  expect(nT).toBeGreaterThanOrEqual(12);
  await page.getByTestId('tab-flat').click();
  const sizes = page.getByTestId('pin-size');

  for (let s = 0; s < SIZES.length; s++) {
    await sizes.nth(s).click();
    for (let i = 0; i < nT; i++) {
      await tpls.nth(i).click();
      await page.waitForTimeout(60);
      await audit(page, `khổ ${SIZES[s].d} mẫu ${i}`, SIZES[s].d);
      if (s === 1) await page.getByTestId('pin-preview').screenshot({ path: path.join(OUT, `pin-${String(i).padStart(2, '0')}.png`) });
    }
  }

  // chữ dài + tên dài 2 dòng ở mọi bố cục có ô tên
  await sizes.nth(1).click();
  for (let i = 0; i < nT; i++) {
    await tpls.nth(i).click();
    for (const k of ['top', 'title', 'sub', 'bottom']) {
      const f = page.getByTestId(`pin-field-${k}`);
      // ô "title" là nhãn ngắn (vai trò / năm / viết tắt) — riêng bảng tên & ảnh thì title là tên người
      const isName = (k === 'sub' && i !== 7) || (k === 'title' && i >= nT - 2);
      const v = k === 'sub' && i === 7 ? 'Kỷ niệm 5 năm yêu nhau · 14.02.2027' : isName ? 'Nguyễn Hoàng Gia Khánh Phương' : k === 'title' ? (i === 7 ? 'Quốc Bảo & Thu Hà' : 'BAN TỔ CHỨC') : 'CÂU LẠC BỘ NHIẾP ẢNH TRẺ THÀNH PHỐ HỒ CHÍ MINH 2027';
      if (await f.count()) await f.fill(v);
    }
    await page.waitForTimeout(60);
    await audit(page, `chữ dài mẫu ${i}`, 44);
    await page.getByTestId('pin-preview').screenshot({ path: path.join(OUT, `pin-long-${String(i).padStart(2, '0')}.png`) });
  }

  // ảnh riêng (bố cục ảnh cặp đôi)
  await page.reload();
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  await page.getByTestId('tab-flat').click();
  await tpls.nth(7).click();
  const png1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAGElEQVR4nGP4z8DwH4QZiBgEG1gAAAZ/A/1H3m9jAAAAAElFTkSuQmCC', 'base64');
  await page.getByTestId('pin-photo').setInputFiles({ name: 'anh.png', mimeType: 'image/png', buffer: png1 });
  await expect(page.locator('[data-testid="pin-preview"] svg image')).toHaveCount(1, { timeout: 10_000 });
  await audit(page, 'ảnh riêng', 44);

  // hàng loạt 30 tên (bố cục sự kiện, khổ 44: 12 con/tờ → 3 tờ)
  await tpls.nth(0).click();
  const names = Array.from({ length: 30 }, (_, i) => ['Quốc Bảo', 'Thu Hà', 'Gia Khánh', 'Bảo Ngọc', 'Châu Anh Thư'][i % 5] + ` ${i + 1}`);
  await page.getByTestId('pin-names').fill(names.join('\n'));
  await expect(page.getByText('30 người → 30 huy hiệu, 3 tờ A4')).toBeVisible();
  const sheetNames = await page.locator('[data-testid="pin-sheet"] svg text').allTextContents();
  expect(sheetNames.join(' ')).toContain('Quốc Bảo 1');

  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdf = fs.readFileSync(await grab('pin-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(3);
  const zip = await grab('pin-svg');
  expect(zip.endsWith('.zip')).toBe(true);
  expect(fs.statSync(zip).size).toBeGreaterThan(20_000);

  // 1 mẫu lặp lại → 1 tờ SVG, có CutContour, chữ đã outline
  await page.getByTestId('pin-names').fill('');
  const svg = fs.readFileSync(await grab('pin-svg'), 'utf8');
  expect(svg).toContain('id="CutContour"');
  expect(svg).toContain('id="In"');
  const cut = /<g[^>]*id="CutContour"[^>]*>([\s\S]*?)<\/g>/.exec(svg)?.[1] || '';
  expect((cut.match(/<circle/g) || []).length).toBe(12); // 12 vòng cắt Ø56 trên tờ A4
  expect(cut).toContain('r="28"');
  expect(svg.includes('<text')).toBe(false);
  const png = fs.readFileSync(await grab('pin-png'));
  expect(png.readUInt32BE(16)).toBe(1600);

  // 3D: đủ 4 kiểu mặt sau
  await page.getByTestId('tab-3d').click();
  const backs = page.getByTestId('pin-back');
  for (let b = 0; b < 4; b++) {
    await backs.nth(b).click();
    await page.waitForTimeout(1500);
    const url = await page.evaluate(() => (window as unknown as { __pinSnap: (w: number, h: number) => Promise<string> }).__pinSnap(1200, 900));
    expect(url.length).toBeGreaterThan(50_000);
    fs.writeFileSync(path.join(OUT, `pin-3d-back-${b}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  const shot = await grab('pin-3d');
  expect(fs.readFileSync(shot).readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
