import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Cờ phướn · cờ dây · cờ cầm tay: mọi mẫu × dáng × khổ — chữ nằm gọn trong dáng cờ, không đè nhau, đủ to;
// file in có nét cắt (CutContour) + chữ đã outline; PDF đúng số trang (2 mặt = 2 trang); 3D dựng được.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'flag');

// hộp mực (ink) của từng <text> quy về hệ toạ độ của đường dáng cờ gần nhất → kiểm tra trong/ngoài + đè nhau
async function audit(page: Page, root: string, minFs: number, label: string) {
  const r = await page.evaluate(({ root, minFs }) => {
    const host = document.querySelector(root)!;
    const ctx = document.createElement('canvas').getContext('2d')!;
    const groups = new Map<SVGPathElement, { pts: DOMPoint[]; text: string; fs: number }[]>();
    const problems: string[] = [];
    host.querySelectorAll('text').forEach((t) => {
      const txt = t.textContent || '';
      if (!txt.trim()) return;
      // dáng cờ chứa chữ: path[data-shape] trong cùng nhóm lá cờ (cờ dây) hoặc svg (phướn/cầm tay)
      let p: Element | null = t.parentElement, shape: SVGPathElement | null = null;
      while (p && !shape) { shape = p.querySelector(':scope > path[data-shape]'); p = p.parentElement; }
      if (!shape) { problems.push(`không thấy dáng cờ cho "${txt}"`); return; }
      const fs = parseFloat(t.getAttribute('font-size') || '0');
      const fam = (t.getAttribute('font-family') || '').replace(/"/g, '');
      ctx.font = `${t.getAttribute('font-weight') || 400} 200px "${fam}"`;
      const m = ctx.measureText(txt); const k = fs / 200;
      const w = m.width * k, asc = m.actualBoundingBoxAscent * k, desc = m.actualBoundingBoxDescent * k;
      const x = parseFloat(t.getAttribute('x') || '0'), y = parseFloat(t.getAttribute('y') || '0');
      const M = (shape.getScreenCTM()!.inverse()).multiply(t.getScreenCTM()!);
      const pts = [[x - w / 2, y - asc], [x + w / 2, y - asc], [x + w / 2, y + desc], [x - w / 2, y + desc], [x, y - asc], [x, y + desc]]
        .map(([a, b]) => new DOMPoint(a, b).matrixTransform(M));
      for (const q of pts) if (!shape.isPointInFill(q)) { problems.push(`"${txt}" lòi ra ngoài dáng cờ`); break; }
      if (fs < minFs) problems.push(`"${txt}" chữ quá nhỏ ${fs.toFixed(1)}mm`);
      if (!groups.has(shape)) groups.set(shape, []);
      groups.get(shape)!.push({ pts, text: txt, fs });
    });
    let n = 0;
    groups.forEach((list) => {
      n += list.length;
      const boxes = list.map((l) => ({ ...l, x0: Math.min(...l.pts.map((p) => p.x)), x1: Math.max(...l.pts.map((p) => p.x)), y0: Math.min(...l.pts.map((p) => p.y)), y1: Math.max(...l.pts.map((p) => p.y)) }));
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
        if (ox > 0.5 && oy > 0.5) problems.push(`"${a.text}" đè "${b.text}"`);
      }
    });
    return { problems, n };
  }, { root, minFs });
  expect(r.problems, label).toEqual([]);
  expect(r.n, `${label}: có chữ`).toBeGreaterThan(0);
}

test('Cờ phướn · cờ dây · cờ cầm tay: mọi mẫu, file in, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/flag');
  await expect(page.getByTestId('fg-tpl').first()).toBeVisible({ timeout: 90_000 });
  await page.getByTestId('tab-flat').click();
  const tpls = page.getByTestId('fg-tpl');

  // ---- phướn: 6 mẫu × 2 dáng × 3 chiều cao ----
  let n = 0;
  for (let i = 0; i < await tpls.count(); i++) {
    await tpls.nth(i).click();
    for (const shape of ['teardrop', 'feather']) {
      await page.getByTestId(`fg-shape-${shape}`).click();
      for (let h = 0; h < 3; h++) {
        await page.getByTestId('fg-height').nth(h).click();
        await audit(page, '[data-testid="fg-front"]', 20, `phướn mẫu ${i} ${shape} cỡ ${h}`);
        n++;
      }
    }
    await page.getByTestId('fg-flat').screenshot({ path: path.join(OUT, `phuon-${i + 1}.png`) });
  }
  expect(n).toBe(36);
  // chữ rất dài vẫn gọn
  await tpls.first().click();
  await page.getByTestId('fg-title').fill('ĐẠI KHAI TRƯƠNG CHI NHÁNH MỚI QUẬN BÌNH THẠNH');
  await page.getByTestId('fg-sub').fill('Giảm 30% toàn bộ đồ uống trong 3 ngày đầu, tặng ly giữ nhiệt cho 100 khách đầu tiên');
  await page.getByTestId('fg-brand').fill('CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ AN KHANG');
  for (const shape of ['teardrop', 'feather']) {
    await page.getByTestId(`fg-shape-${shape}`).click();
    await audit(page, '[data-testid="fg-front"]', 20, `phướn chữ dài ${shape}`);
  }
  // logo + in 2 mặt
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 300; c.height = 300; const x = c.getContext('2d')!;
    x.fillStyle = '#264653'; x.beginPath(); x.arc(150, 150, 140, 0, 7); x.fill(); x.fillStyle = '#E9C46A'; x.fillRect(90, 90, 120, 120);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.getByTestId('fg-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.locator('[data-testid="fg-front"] image')).toHaveCount(1, { timeout: 10_000 });
  await page.getByTestId('fg-sides-2').click();
  await expect(page.getByTestId('fg-back')).toBeVisible();
  await page.getByTestId('fg-flat').screenshot({ path: path.join(OUT, 'phuon-2-mat-logo.png') });

  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pages = (b: Buffer) => (b.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  await page.getByTestId('fg-height').first().click();
  let pdf = fs.readFileSync(await grab('fg-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect(pages(pdf)).toBe(2);
  const svgs: string[] = [];
  const [d1, d2] = await Promise.all([
    page.waitForEvent('download', { timeout: 60_000 }),
    page.waitForEvent('download', { timeout: 60_000, predicate: (d) => d.suggestedFilename().includes('mat-sau') }),
    page.getByTestId('fg-svg').click(),
  ]);
  for (const d of [d1, d2]) { const p = path.join(OUT, d.suggestedFilename()); await d.saveAs(p); svgs.push(fs.readFileSync(p, 'utf8')); }
  for (const s of svgs) { expect(s).toContain('CutContour'); expect(s).toContain('Fold'); expect(s).not.toContain('<text'); }
  const pngW = fs.readFileSync(await grab('fg-png')).readUInt32BE(16);
  expect(pngW).toBeGreaterThan(500);
  await page.getByTestId('fg-sides-1').click();
  pdf = fs.readFileSync(await grab('fg-pdf'));
  expect(pages(pdf)).toBe(1);
  // 3D phướn: 2 dáng × 2 chân đế
  for (const [shape, base] of [['teardrop', 'cross'], ['feather', 'water']]) {
    await page.getByTestId(`fg-shape-${shape}`).click(); await page.getByTestId(`fg-base-${base}`).click();
    const url = await page.evaluate(() => (window as unknown as { __flagSnap: (w: number, h: number) => Promise<string> }).__flagSnap(900, 1200));
    fs.writeFileSync(path.join(OUT, `phuon-3d-${shape}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }

  // ---- cờ dây: 4 mẫu × 2 dáng × 2 cỡ ----
  await page.getByTestId('fg-kind-bunting').click();
  for (let i = 0; i < await tpls.count(); i++) {
    await tpls.nth(i).click();
    for (const pen of ['triangle', 'swallow']) {
      await page.getByTestId(`fg-pennant-${pen}`).click();
      for (let z = 0; z < 2; z++) {
        await page.getByTestId('fg-psize').nth(z).click();
        await audit(page, '[data-testid="fg-row"]', z ? 75 : 50, `cờ dây mẫu ${i} ${pen} cỡ ${z}`);
      }
    }
    await page.getByTestId('fg-flat').screenshot({ path: path.join(OUT, `co-day-${i + 1}.png`) });
  }
  // số lá = số chữ cái (+2 lá logo)
  await page.getByTestId('fg-word').fill('GRAND OPENING');
  await expect(page.locator('[data-testid="fg-row"] [data-pennant-i]')).toHaveCount(15);
  const sheet = fs.readFileSync(await grab('fg-svg'), 'utf8');
  expect((sheet.match(/CutContour/g) || []).length).toBe(15);
  expect(sheet).not.toContain('<text');
  pdf = fs.readFileSync(await grab('fg-pdf'));
  expect(pages(pdf)).toBe(1);
  let url = await page.evaluate(() => (window as unknown as { __flagSnap: (w: number, h: number) => Promise<string> }).__flagSnap(1200, 900));
  fs.writeFileSync(path.join(OUT, 'co-day-3d.png'), Buffer.from(url.split(',')[1], 'base64'));

  // ---- cờ cầm tay ----
  await page.getByTestId('fg-kind-hand').click();
  for (let i = 0; i < await tpls.count(); i++) {
    await tpls.nth(i).click();
    for (let z = 0; z < 2; z++) {
      await page.getByTestId('fg-hsize').nth(z).click();
      for (let l = 0; l < 3; l++) {
        await page.getByTestId('fg-layout').nth(l).click();
        await audit(page, '[data-testid="fg-front"]', 6, `cờ cầm tay mẫu ${i} cỡ ${z} bố cục ${l}`);
      }
    }
    await page.getByTestId('fg-flat').screenshot({ path: path.join(OUT, `cam-tay-${i + 1}.png`) });
  }
  await page.getByTestId('fg-title').fill('CHÀO MỪNG QUÝ KHÁCH ĐẾN VỚI HỘI CHỢ');
  await audit(page, '[data-testid="fg-front"]', 6, 'cờ cầm tay chữ dài');
  url = await page.evaluate(() => (window as unknown as { __flagSnap: (w: number, h: number) => Promise<string> }).__flagSnap(1200, 900));
  fs.writeFileSync(path.join(OUT, 'cam-tay-3d.png'), Buffer.from(url.split(',')[1], 'base64'));
  const p3 = fs.readFileSync(await grab('fg-3dpng'));
  expect(p3.readUInt32BE(16)).toBe(1600);

  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
