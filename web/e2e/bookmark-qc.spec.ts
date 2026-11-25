import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Bookmark kẹp sách: mọi mẫu × khổ × kiểu đầu — chữ nằm gọn vùng an toàn (trong hình bế, tránh lỗ dây tua, không đè nhau),
// tờ in có CutContour đủ con (hình + lỗ), tự xếp ngang khi được nhiều con hơn, tải PNG/PDF/SVG, 3D dựng được, không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'bookmark');

async function audit(page: Page, label: string) {
  for (const side of ['front', 'back'] as const) {
    const r = await page.locator(`[data-testid="bm-${side}"] svg`).evaluate((svg: SVGSVGElement) => {
      const cut = svg.querySelector('[data-cut]') as SVGPathElement;
      const safe = svg.querySelector('[data-safe]') as SVGRectElement;
      const hole = svg.querySelector('[data-hole]') as SVGCircleElement | null;
      const sx = safe.x.baseVal.value, sy = safe.y.baseVal.value, sw = safe.width.baseVal.value, sh = safe.height.baseVal.value;
      const inv = svg.getScreenCTM()!.inverse();
      const bad: string[] = [];
      const boxes: { t: string; x0: number; y0: number; x1: number; y1: number }[] = [];
      let minSize = 999;
      const texts = Array.from(svg.querySelectorAll('text')).filter((t) => (t.textContent || '').trim());
      for (const t of texts) {
        const b = t.getBBox();
        if (!b.width) continue;
        const m = inv.multiply(t.getScreenCTM()!);
        const fs = parseFloat(t.getAttribute('font-size') || '0');
        minSize = Math.min(minSize, fs);
        // bbox chữ có khoảng trống trên/dưới theo font — co theo cỡ chữ cho sát nét chữ thật
        const padY = fs * 0.16, padX = Math.min(b.width * 0.03, fs * 0.1);
        const pts = [[b.x + padX, b.y + padY], [b.x + b.width - padX, b.y + padY], [b.x + padX, b.y + b.height - padY], [b.x + b.width - padX, b.y + b.height - padY]].map(([x, y]) => {
          const p = svg.createSVGPoint(); p.x = x; p.y = y; return p.matrixTransform(m);
        });
        const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
        const bx = { t: t.textContent || '', x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
        boxes.push(bx);
        if (!pts.every((p) => cut.isPointInFill(p))) bad.push(`ra ngoài hình: "${bx.t}"`);
        const tol = 6; // 0.6mm
        if (bx.x0 < sx - tol || bx.x1 > sx + sw + tol || bx.y0 < sy - tol || bx.y1 > sy + sh + tol) bad.push(`ra ngoài vùng an toàn: "${bx.t}"`);
        if (hole) {
          const cx = hole.cx.baseVal.value, cy = hole.cy.baseVal.value, rr = hole.r.baseVal.value + 15;
          const nx = Math.max(bx.x0, Math.min(cx, bx.x1)), ny = Math.max(bx.y0, Math.min(cy, bx.y1));
          if (Math.hypot(nx - cx, ny - cy) < rr) bad.push(`đè lỗ dây tua: "${bx.t}"`);
        }
      }
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
        if (ox > 4 && oy > 4) bad.push(`chồng chữ: "${a.t}" × "${b.t}"`);
      }
      return { bad, n: texts.length, minSize };
    });
    expect(r.n, `${label} ${side}: có chữ`).toBeGreaterThan(1);
    expect(r.bad, `${label} ${side}`).toEqual([]);
    expect(r.minSize, `${label} ${side}: chữ nhỏ nhất ${r.minSize / 10}mm`).toBeGreaterThanOrEqual(13);
  }
}

test('Bookmark: mọi mẫu × khổ × kiểu đầu, file in, 3D', async ({ page }) => {
  test.setTimeout(480_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/bookmark');
  const tpls = page.getByTestId('bm-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId('mockup-3d').locator('canvas')).toHaveCount(1, { timeout: 90_000 });
  await page.getByTestId('tab-flat').click();

  const sizes = page.locator('[data-testid="bm-sizes"] button');
  const tops = page.locator('[data-testid="bm-tops"] button');
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(10);
  let checked = 0;
  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click();
    for (let s = 0; s < await sizes.count(); s++) {
      await sizes.nth(s).click();
      for (let t = 0; t < await tops.count(); t++) {
        await tops.nth(t).click();
        await page.waitForTimeout(40);
        await audit(page, `mẫu ${i} khổ ${s} đầu ${t}`);
        checked++;
      }
    }
    await sizes.first().click();
    await page.getByTestId('bm-flat').screenshot({ path: path.join(OUT, `mau-${String(i).padStart(2, '0')}.png`) });
  }
  expect(checked).toBe(n * 9);

  // nội dung dài ở mọi bố cục + bỏ lỗ dây tua
  const long: Record<string, string> = {
    quote: 'Người ta thường nói rằng sách là ngọn đèn sáng bất diệt của trí tuệ con người, ai chăm đọc sách thì đường đời ít khi lạc lối.',
    author: 'Lời dạy của các thế hệ thầy cô giáo đi trước',
    brand: 'NHÀ SÁCH VÀ CÀ PHÊ SÁCH GIA KHÁNH CHI NHÁNH TRUNG TÂM',
    title: 'Những Ngày Thơ Ấu Bên Dòng Sông Quê Nhà',
    subtitle: 'Tiểu thuyết đầu tay',
    message: 'Một câu chuyện dài về những người bạn nhỏ lớn lên bên dòng sông, đi qua mùa nước nổi, mùa gặt và những mùa Tết đoàn viên ấm áp, giữ mãi ước mơ tuổi thơ.',
    name1: 'Nguyễn Hoàng Quốc Bảo', name2: 'Trần Ngọc Thu Hà',
    address: 'Tầng 2, 123 Đường Nguyễn Văn Cừ, Phường 2, Quận 5, TP.HCM',
    slogan: 'Mỗi ngày một trang sách hay cho tâm hồn thêm xanh',
  };
  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click();
    for (const [k, v] of Object.entries(long)) {
      const inp = page.getByTestId(`bm-${k}`);
      if (await inp.count()) await inp.fill(v);
    }
    await page.waitForTimeout(80);
    await audit(page, `chữ dài mẫu ${i}`);
  }
  await page.getByTestId('bm-flat').screenshot({ path: path.join(OUT, 'chu-dai.png') });
  await page.getByTestId('bm-hole').uncheck();
  await audit(page, 'không lỗ');
  const cutNoHole = await page.locator('[data-testid="bm-sheet-front"] svg').evaluate((s) => Array.from(s.querySelectorAll('#CutContour path')).every((p) => ((p.getAttribute('d') || '').match(/M/g) || []).length === 1));
  expect(cutNoHole, 'không lỗ → đường bế chỉ có hình').toBe(true);
  await page.getByTestId('bm-hole').check();

  // logo + ảnh khách (PNG sinh tại chỗ) vào mẫu ra mắt sách
  await tpls.nth(2).click();
  const mk = (col: string) => page.evaluate((c) => { const cv = document.createElement('canvas'); cv.width = 300; cv.height = 300; const x = cv.getContext('2d')!; x.fillStyle = c; x.fillRect(0, 0, 300, 300); x.fillStyle = '#fff'; x.beginPath(); x.arc(150, 150, 90, 0, 7); x.fill(); return cv.toDataURL('image/png').split(',')[1]; }, col);
  await page.getByTestId('bm-logo-input').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(await mk('#2A6F97'), 'base64') });
  await page.getByTestId('bm-photo-input').setInputFiles({ name: 'anh.png', mimeType: 'image/png', buffer: Buffer.from(await mk('#C2410C'), 'base64') });
  await expect(page.locator('[data-testid="bm-front"] svg image[data-photo]')).toHaveCount(1, { timeout: 10_000 });
  await expect(page.locator('[data-testid="bm-back"] svg image')).toHaveCount(1);
  await audit(page, 'có logo + ảnh');

  // tờ in: CutContour đủ con (hình + lỗ); khổ 5,5×18 trên A4 → tự xếp ngang được nhiều con hơn
  const sheetInfo = () => page.locator('[data-testid="bm-sheet-front"] svg').evaluate((s) => ({
    count: Number(s.getAttribute('data-count')), rot: s.getAttribute('data-rot'), cuts: s.querySelectorAll('#CutContour path').length,
    holes: Array.from(s.querySelectorAll('#CutContour path')).every((p) => ((p.getAttribute('d') || '').match(/M/g) || []).length === 2),
  }));
  let sh = await sheetInfo();
  expect(sh.cuts).toBe(sh.count);
  expect(sh.holes, 'đường bế gồm hình + lỗ').toBe(true);
  await sizes.nth(1).click();
  sh = await sheetInfo();
  expect(sh.rot, 'khổ 5,5×18 trên A4 nên xếp ngang').toBe('1');
  expect(sh.count).toBeGreaterThanOrEqual(4);
  await page.locator('[data-testid="bm-sheets"] button').nth(2).click(); // SRA3
  sh = await sheetInfo();
  expect(sh.count).toBeGreaterThanOrEqual(10);
  await page.locator('[data-testid="bm-sheets"] button').nth(0).click();
  await sizes.first().click();

  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pages = (buf: Buffer) => (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  expect(fs.readFileSync(await grab('bm-png-front')).readUInt32BE(16)).toBe(1200);
  expect(fs.readFileSync(await grab('bm-png-back')).readUInt32BE(16)).toBe(1200);
  // mẫu ra mắt sách navy = ép kim → PDF 4 trang (2 mặt + 2 khuôn ép)
  let pdf = fs.readFileSync(await grab('bm-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect(pages(pdf)).toBe(4);
  await page.locator('[data-testid="bm-materials"] button').first().click();
  pdf = fs.readFileSync(await grab('bm-pdf'));
  expect(pages(pdf)).toBe(2);
  const svg = fs.readFileSync(await grab('bm-svg'), 'utf8');
  expect(svg).toContain('id="CutContour"');
  expect(svg).toContain('id="In"');
  expect(svg).not.toMatch(/<text[\s>]/); // chữ đã outline

  // ảnh 3D các mẫu tiêu biểu (góc mặc định, khổ lớn)
  await page.getByTestId('tab-3d').click();
  const shots: [number, string][] = [[0, 'nha-sach'], [2, 'ra-mat-sach-ep-kim'], [6, 'qua-cuoi'], [8, 'tet'], [10, 'truyen-kieu']];
  for (const [i, nm] of shots) {
    await tpls.nth(i).click();
    await page.waitForTimeout(400);
    const url = await page.evaluate(() => (window as unknown as { __bmSnap: (w: number, h: number) => Promise<string> }).__bmSnap(1600, 1200));
    fs.writeFileSync(path.join(OUT, `3d-${nm}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  await expect(page.locator('[data-testid="mockup-3d"] canvas')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
