import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Lót chuột / desk mat: mọi mẫu × mọi khổ hợp lệ — chữ nằm trong vùng an toàn (lót tròn: trong vòng tròn), không đè nhau,
// không quá nhỏ; file in đúng khổ + lề xén, SVG có CutContour + chữ đã chuyển nét; cảnh báo ảnh mờ; logo; 3D chụp được.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'mousepad');
fs.mkdirSync(OUT, { recursive: true });

async function img(page: Page, w: number, h: number, type = 'image/jpeg'): Promise<Buffer> {
  const b64 = await page.evaluate(([w, h, type]) => {
    const c = document.createElement('canvas'); c.width = +w; c.height = +h;
    const x = c.getContext('2d')!;
    const g = x.createLinearGradient(0, 0, +w, +h); g.addColorStop(0, '#1F7AA0'); g.addColorStop(1, '#F1DDB8');
    x.fillStyle = g; x.fillRect(0, 0, +w, +h);
    x.fillStyle = '#C8A24A'; x.beginPath(); x.arc(+w * 0.5, +h * 0.5, Math.min(+w, +h) * 0.3, 0, 7); x.fill();
    return c.toDataURL(String(type), 0.9).split(',')[1];
  }, [w, h, type] as const);
  return Buffer.from(b64, 'base64');
}

/** kiểm tra chữ trong mặt lót đang xem (tab bản thiết kế) */
async function audit(page: Page, label: string) {
  const bad = await page.evaluate(() => {
    const out: string[] = [];
    const svg = document.querySelector('[data-testid="mp-face"] svg') as SVGSVGElement;
    const W = +svg.dataset.w!, H = +svg.dataset.h!, s = +svg.dataset.safe!, round = svg.dataset.round === '1';
    const inv = svg.getScreenCTM()!.inverse();
    const boxes: { s: string; x: number; y: number; w: number; h: number }[] = [];
    svg.querySelectorAll('text').forEach((t) => {
      const role = t.getAttribute('data-role');
      if (!(t.textContent || '').trim() || role === 'glow') return;
      const b = (t as SVGTextElement).getBBox();
      const m = inv.multiply((t as SVGTextElement).getScreenCTM()!);
      const pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      const r = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
      const k = r.h * 0.22; // bỏ phần đệm trên/dưới của font
      const core = { x: r.x, y: r.y + k, w: r.w, h: r.h - k * 2 };
      const tol = 0.8;
      if (round) {
        const R = W / 2 - s * 0.5;
        for (const [x, y] of [[core.x, core.y], [core.x + core.w, core.y], [core.x, core.y + core.h], [core.x + core.w, core.y + core.h]]) {
          if (Math.hypot(x - W / 2, y - H / 2) > R + tol) { out.push(`ngoài vòng tròn: "${t.textContent}"`); break; }
        }
      } else if (core.x < s - tol || core.y < s - tol || core.x + core.w > W - s + tol || core.y + core.h > H - s + tol) {
        out.push(`ngoài vùng an toàn: "${t.textContent}" [${core.x.toFixed(1)},${core.y.toFixed(1)} ${core.w.toFixed(1)}×${core.h.toFixed(1)}] khổ ${W}×${H}`);
      }
      if (r.h < 2.4) out.push(`chữ quá nhỏ: "${t.textContent}" (${r.h.toFixed(2)}mm)`);
      if (role !== 'mono') boxes.push({ s: t.textContent || '', ...core });
    });
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 0.6 && oy > 0.6) out.push(`đè nhau: "${a.s}" × "${b.s}"`);
    }
    return out;
  });
  expect(bad, `${label}: ${bad.slice(0, 6).join(' | ')}`).toEqual([]);
}

async function settle(page: Page) { await page.waitForTimeout(350); }

test('Lót chuột: mọi mẫu × khổ, file in, ảnh mờ, logo, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/mousepad');
  const tpls = page.getByTestId('mp-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 120_000 });
  expect(await tpls.count()).toBeGreaterThanOrEqual(12);
  await page.getByTestId('tab-flat').click();
  const sizes = page.locator('[data-testid="mp-sizes"] button');

  // mọi mẫu × mọi khổ hợp lệ
  const n = await tpls.count();
  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click(); await settle(page);
    await audit(page, `mẫu ${i}`);
    await page.getByTestId('mp-face').screenshot({ path: path.join(OUT, `mp-${String(i).padStart(2, '0')}.png`) });
    for (let z = 0; z < await sizes.count(); z++) {
      if (await sizes.nth(z).isDisabled()) continue;
      await sizes.nth(z).click(); await settle(page);
      await audit(page, `mẫu ${i} khổ ${z}`);
      // file in: đúng khổ + lề xén 3mm, có nét cắt
      const pv = await page.evaluate(() => {
        const svg = document.querySelector('[data-testid="mp-cut-file"] svg') as SVGSVGElement;
        const vb = svg.viewBox.baseVal;
        return { w: vb.width, h: vb.height, W: +svg.dataset.w!, H: +svg.dataset.h!, cut: !!svg.querySelector('#CutContour path') };
      });
      expect(pv.w).toBeCloseTo(pv.W + 6, 1); expect(pv.h).toBeCloseTo(pv.H + 6, 1); expect(pv.cut).toBe(true);
    }
  }

  // nội dung dài: vẫn gọn trong vùng an toàn
  const long: [number, string, string][] = [
    [0, 'mp-field-title', 'Kỷ niệm chuyến đi biển đầu tiên của cả gia đình mình'],
    [3, 'mp-field-brand', 'CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ AN KHANG TOÀN CẦU'],
    [5, 'mp-field-title', 'QUỐC BẢO STREAMER CHUYÊN NGHIỆP'],
    [11, 'mp-field-title', 'Chúc bé Thu Hà một ngày thật nhiều niềm vui và tiếng cười'],
    [13, 'mp-field-quote', 'Thành công không phải là đích đến cuối cùng, thất bại cũng không phải là dấu chấm hết; điều quan trọng là lòng can đảm để tiếp tục bước tới mỗi ngày.'],
  ];
  for (const [ti, field, text] of long) {
    await tpls.nth(ti).click(); await settle(page);
    await page.getByTestId(field).fill(text); await settle(page);
    for (let z = 0; z < await sizes.count(); z++) {
      if (await sizes.nth(z).isDisabled()) continue;
      await sizes.nth(z).click(); await settle(page);
      await audit(page, `dài ${field} khổ ${z}`);
    }
  }
  await page.getByTestId('mp-face').screenshot({ path: path.join(OUT, 'mp-long-quote.png') });

  // ảnh mờ → cảnh báo; ảnh nét → không
  await tpls.nth(0).click(); await settle(page);
  await sizes.nth(3).click(); await settle(page);
  await page.getByTestId('mp-photo-input').setInputFiles({ name: 'nho.jpg', mimeType: 'image/jpeg', buffer: await img(page, 400, 300) });
  await expect(page.getByTestId('mp-dpi-warn')).toBeVisible({ timeout: 15_000 });
  await sizes.nth(0).click();
  await page.getByTestId('mp-photo-input').setInputFiles({ name: 'net.jpg', mimeType: 'image/jpeg', buffer: await img(page, 3200, 2700) });
  await expect.poll(async () => Number(await page.getByTestId('mp-dpi').getAttribute('data-dpi')), { timeout: 20_000 }).toBeGreaterThanOrEqual(150);
  await expect(page.getByTestId('mp-dpi-warn')).toHaveCount(0);

  // logo công ty
  await tpls.nth(3).click(); await settle(page);
  await page.getByTestId('mp-logo-input').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: await img(page, 400, 400, 'image/png') });
  await expect(page.locator('[data-testid="mp-face"] svg image[data-role="logo"]')).toHaveCount(1, { timeout: 15_000 });
  await audit(page, 'logo tải lên');

  // tải file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdf = fs.readFileSync(await grab('mp-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect(pdf.length).toBeGreaterThan(30_000);
  const svg = fs.readFileSync(await grab('mp-svg'), 'utf8');
  expect(svg).toContain('id="CutContour"');
  expect((svg.match(/<text/g) || []).length).toBe(0);
  const png = fs.readFileSync(await grab('mp-png'));
  expect(png.readUInt32BE(16)).toBe(2000);

  // 3D: lót nhỏ, tròn, desk mat (có / không đồ đặt kèm)
  await page.getByTestId('tab-3d').click();
  for (const ti of [0, 6, 9]) {
    await tpls.nth(ti).click(); await settle(page);
    const url = await page.evaluate(() => (window as unknown as { __mpSnap: (w: number, h: number) => Promise<string> }).__mpSnap(1200, 900));
    expect(url.length).toBeGreaterThan(20_000);
    fs.writeFileSync(path.join(OUT, `mp-3d-${ti}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  await page.getByTestId('mp-props').uncheck();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1500);
  const shot = fs.readFileSync(await grab('mp-shot'));
  expect(shot.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
