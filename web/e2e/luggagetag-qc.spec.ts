import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Thẻ hành lý: 3 loại × mọi mẫu — chữ nằm gọn trong viền thẻ, né khe xỏ dây, không chồng chữ, cỡ ≥1.4mm,
// mặt sau da/cao su: chữ nằm trong ô cửa sổ; danh sách tên → mỗi người 1 mặt sau; tải PNG/PDF/SVG; 3D dựng được.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'luggagetag');
const WINDOW: Record<string, [number, number, number, number]> = { leather: [8, 20, 50, 78], rubber: [9, 21, 44, 68] }; // mm

async function audit(page: Page, kind: string, label: string) {
  for (const side of ['front', 'back'] as const) {
    const r = await page.locator(`[data-testid="lt-${side}"] svg`).evaluate((svg: SVGSVGElement, a: { win: number[] | null; side: string }) => {
      const cut = svg.querySelector('[data-cut]') as SVGPathElement;
      const slot = svg.querySelector('[data-slot-box]') as SVGRectElement;
      const sx = slot.x.baseVal.value, sy = slot.y.baseVal.value, sw = slot.width.baseVal.value, sh = slot.height.baseVal.value;
      const inv = svg.getScreenCTM()!.inverse();
      const bad: string[] = [];
      const boxes: { x0: number; y0: number; x1: number; y1: number; t: string }[] = [];
      const texts = Array.from(svg.querySelectorAll('text')).filter((t) => (t.textContent || '').trim() && !t.closest('[data-dup]')); // bỏ bản bóng đổ / ánh sáng nổi (cố ý lệch)
      for (const t of texts) {
        const b = t.getBBox();
        if (!b.width) continue;
        const m = inv.multiply(t.getScreenCTM()!);
        const ins = 0.14 * Math.min(b.width, b.height);
        const pts = [[b.x + ins, b.y + ins], [b.x + b.width - ins, b.y + ins], [b.x + ins, b.y + b.height - ins], [b.x + b.width - ins, b.y + b.height - ins]].map(([x, y]) => {
          const p = svg.createSVGPoint(); p.x = x; p.y = y; return p.matrixTransform(m);
        });
        const label = (t.textContent || '').trim();
        if (!pts.every((p) => cut.isPointInFill(p))) bad.push(`ra ngoài: "${label}"`);
        const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
        const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
        if (x1 > sx - 10 && x0 < sx + sw + 10 && y1 > sy - 10 && y0 < sy + sh + 10) bad.push(`đè khe: "${label}"`);
        if (a.win && a.side === 'back') {
          const [wx, wy, ww, wh] = a.win.map((v) => v * 10);
          if (x0 < wx || x1 > wx + ww || y0 < wy || y1 > wy + wh) bad.push(`ngoài ô cửa sổ: "${label}"`);
        }
        const fs = parseFloat(t.getAttribute('font-size') || '0') * Math.hypot(m.a, m.b) / 10;
        if (fs < 1.4) bad.push(`chữ nhỏ ${fs.toFixed(2)}mm: "${label}"`);
        if (!t.closest('[data-arc]')) boxes.push({ x0, y0, x1, y1, t: label });
      }
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const A = boxes[i], B = boxes[j];
        const ox = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0), oy = Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0);
        if (ox > 4 && oy > 4) bad.push(`chồng chữ: "${A.t}" × "${B.t}"`);
      }
      return { bad, n: texts.length };
    }, { win: WINDOW[kind] || null, side });
    expect(r.n, `${label} ${side}: có chữ`).toBeGreaterThan(1);
    expect(r.bad, `${label} ${side}`).toEqual([]);
  }
}

const grab = async (page: Page, id: string) => {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
  const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
};
const pngW = (p: string) => fs.readFileSync(p).readUInt32BE(16);
const pdfPages = (p: string) => (fs.readFileSync(p).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;

test('Thẻ hành lý: 3 loại × mọi mẫu, danh sách tên, file in, 3D', async ({ page }) => {
  test.setTimeout(480_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/luggagetag');
  const tpls = page.getByTestId('lt-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId('mockup-3d').locator('canvas')).toHaveCount(1, { timeout: 90_000 });
  await page.getByTestId('tab-flat').click();

  // 3 loại × 12 mẫu
  for (const kind of ['pvc', 'leather', 'rubber']) {
    await page.getByTestId(`lt-kind-${kind}`).click();
    const n = await tpls.count();
    expect(n).toBeGreaterThanOrEqual(10);
    for (let i = 0; i < n; i++) {
      await tpls.nth(i).click();
      await page.waitForTimeout(60);
      await audit(page, kind, `${kind} mẫu ${i}`);
    }
    await page.getByTestId('lt-flat').screenshot({ path: path.join(OUT, `flat-${kind}.png`) });
  }

  // chữ dài + logo, cả 3 loại × 6 bố cục
  await page.getByTestId('lt-brand').fill('CÔNG TY TNHH DỊCH VỤ DU LỊCH LỮ HÀNH QUỐC TẾ AN KHANG');
  await page.getByTestId('lt-slogan').fill('Đồng hành cùng bạn trên mọi nẻo đường Việt Nam và thế giới');
  await page.getByTestId('lt-names').fill('Nguyễn Hoàng Quốc Bảo Thiên Long | 0909 123 456 789\nThu Hà | 0912 345 678\nGia Khánh');
  await page.getByTestId('lt-tour').fill('Tour Đà Nẵng – Hội An – Bà Nà Hills – Cù Lao Chàm 5N4Đ');
  for (const kind of ['pvc', 'leather', 'rubber']) {
    await page.getByTestId(`lt-kind-${kind}`).click();
    for (let i = 0; i < 12; i += 2) { await tpls.nth(i).click(); await page.waitForTimeout(60); await audit(page, kind, `${kind} chữ dài mẫu ${i}`); }
  }
  const logoUrl = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = c.height = 120;
    const x = c.getContext('2d')!; x.fillStyle = '#1E3A8A'; x.beginPath(); x.arc(60, 60, 50, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#FFFFFF'; x.fillRect(40, 40, 40, 40);
    return c.toDataURL('image/png');
  });
  const logo = Buffer.from(logoUrl.split(',')[1], 'base64');
  await page.getByTestId('lt-logo-input').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: logo });
  const logoCount = () => page.locator('[data-testid="lt-front"] svg image').count();
  await expect.poll(logoCount, { timeout: 15_000 }).toBeGreaterThan(0);
  await page.getByTestId('lt-kind-leather').click();
  await expect.poll(logoCount).toBeGreaterThan(0);
  await page.getByTestId('lt-kind-pvc').click();
  await expect.poll(logoCount).toBeGreaterThan(0);

  // danh sách 3 người → 3 lựa chọn + 3 mặt sau file in; mặt sau người 2 đúng tên
  await page.getByTestId('lt-kind-pvc').click();
  await page.getByTestId('lt-brand').fill('AN KHANG TRAVEL');
  await page.getByTestId('lt-slogan').fill('Vi vu khắp muôn nơi');
  await expect(page.getByTestId('lt-who').locator('option')).toHaveCount(3);
  await page.getByTestId('lt-who').selectOption('1');
  await expect(page.getByTestId('lt-back')).toContainText('Thu Hà');
  await expect(page.locator('[data-testid="lt-print-backs"] > div')).toHaveCount(3);

  // tải file PVC
  const pf = await grab(page, 'lt-png-front'); expect(pngW(pf)).toBe(1600);
  const pb = await grab(page, 'lt-png-back'); expect(pngW(pb)).toBe(1600);
  const pdf = await grab(page, 'lt-pdf');
  expect(fs.readFileSync(pdf).subarray(0, 4).toString()).toBe('%PDF');
  expect(pdfPages(pdf)).toBe(4);
  const svg = fs.readFileSync(await grab(page, 'lt-svg'), 'utf8');
  expect(svg).toContain('id="CutContour"');
  expect(svg).not.toContain('<text');
  // da: khuôn ép + 3 thẻ kẹp
  await page.getByTestId('lt-kind-leather').click();
  const pdf2 = await grab(page, 'lt-pdf');
  expect(pdfPages(pdf2)).toBe(4);

  // 3D từng loại
  for (const kind of ['pvc', 'leather', 'rubber']) {
    await page.getByTestId(`lt-kind-${kind}`).click();
    await page.waitForTimeout(500);
    const url = await page.evaluate(() => (window as unknown as { __ltSnap: (w: number, h: number) => Promise<string> }).__ltSnap(1200, 900));
    const buf = Buffer.from(url.split(',')[1], 'base64');
    expect(buf.length).toBeGreaterThan(60_000);
    fs.writeFileSync(path.join(OUT, `3d-${kind}.png`), buf);
  }
  expect(errors).toEqual([]);
});
