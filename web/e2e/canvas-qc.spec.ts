import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Tranh canvas: mọi mẫu dựng được, chữ nằm trong mặt tranh, file in đúng khổ (mặt + mép gấp + lề vạch),
// cảnh báo ảnh mờ theo dpi, bộ 3 tấm → PDF 3 trang, ảnh 3D chụp được, không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'canvas');
fs.mkdirSync(OUT, { recursive: true });

const FOLD = 30, MARK = 12;

async function jpeg(page: Page, w: number, h: number): Promise<Buffer> {
  const b64 = await page.evaluate(([w, h]) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d')!;
    const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#2F6F73'); g.addColorStop(1, '#E8C9A0');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = '#C8A24A'; x.beginPath(); x.arc(w * 0.6, h * 0.4, Math.min(w, h) * 0.2, 0, 7); x.fill();
    return c.toDataURL('image/jpeg', 0.9).split(',')[1];
  }, [w, h]);
  return Buffer.from(b64, 'base64');
}

// chữ trong mặt tranh (face) không lòi ra ngoài
async function textInside(page: Page, label: string) {
  const bad = await page.evaluate(() => {
    const out: string[] = [];
    document.querySelectorAll('[data-testid="cv-face"] svg').forEach((svg) => {
      const vb = (svg as SVGSVGElement).viewBox.baseVal;
      svg.querySelectorAll('text').forEach((t) => {
        if (!(t.textContent || '').trim()) return;
        const b = (t as SVGTextElement).getBBox();
        const tol = 0.5;
        if (b.x < vb.x - tol || b.y < vb.y - tol || b.x + b.width > vb.x + vb.width + tol || b.y + b.height > vb.y + vb.height + tol) out.push(`${t.textContent} [${b.x.toFixed(1)},${b.y.toFixed(1)},${b.width.toFixed(1)}x${b.height.toFixed(1)}] vb ${vb.width}x${vb.height}`);
        if (b.height < 4) out.push(`chữ quá nhỏ: ${t.textContent} (${b.height.toFixed(1)}mm)`);
      });
      // chữ khác kiểu (tên viết tay vs ngày/dòng nhỏ) không được đè nhau — so trên hộp thu gọn (bỏ phần đệm trên/dưới của font)
      const ts = Array.from(svg.querySelectorAll('text')).filter((t) => (t.textContent || '').trim()).map((t) => {
        const b = (t as SVGTextElement).getBBox(); const k = b.height * 0.22;
        return { fam: t.getAttribute('font-family') || '', s: t.textContent || '', x: b.x, y: b.y + k, w: b.width, h: b.height - k * 2 };
      });
      for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) {
        const A = ts[i], B = ts[j];
        if (A.fam === B.fam) continue;
        const ix = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x), iy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
        if (ix > 0 && iy > 0.5) out.push(`đè: "${A.s}" × "${B.s}" (${iy.toFixed(1)}mm)`);
      }
    });
    return out;
  });
  expect(bad, `${label}: chữ lòi ngoài mặt tranh / quá nhỏ`).toEqual([]);
}

async function printDims(page: Page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="cv-print"] svg')).map((s) => {
    const vb = (s as SVGSVGElement).viewBox.baseVal; return { w: Math.round(vb.width), h: Math.round(vb.height) };
  }));
}

test('Tranh canvas: mẫu, khổ, mép, ảnh mờ, file in, 3D', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/canvas');
  const tpls = page.getByTestId('cv-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 60_000 });
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(10);
  // ảnh 3D mặc định (mẫu ảnh cưới) để soi
  await page.waitForFunction(() => !!(window as unknown as { __cvSnap?: unknown }).__cvSnap);
  const snap0 = await page.evaluate(() => (window as unknown as { __cvSnap: (w: number, h: number) => Promise<string> }).__cvSnap(1200, 900));
  fs.writeFileSync(path.join(OUT, '3d-mac-dinh.png'), Buffer.from(snap0.split(',')[1], 'base64'));
  await page.getByTestId('tab-flat').click();

  // 1) mọi mẫu: chữ trong mặt tranh, số tấm đúng, file in đúng khổ (40×60, khung 3cm)
  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click();
    await page.waitForTimeout(250);
    const faces = await page.locator('[data-testid="cv-face"] svg').count();
    await textInside(page, `mẫu ${i}`);
    const dims = await printDims(page);
    expect(dims.length, `mẫu ${i}: số tấm`).toBe(faces);
    for (const d of dims) {
      const short = Math.min(d.w, d.h), long = Math.max(d.w, d.h);
      expect(short, `mẫu ${i}: khổ file in`).toBe(400 + (30 + FOLD + MARK) * 2);
      expect(long).toBe(600 + (30 + FOLD + MARK) * 2);
    }
    await page.getByTestId('cv-face').screenshot({ path: path.join(OUT, `mau-${String(i + 1).padStart(2, '0')}.png`) });
  }

  // 2) chữ dài vẫn gọn (ảnh cưới + câu nói)
  await tpls.nth(1).click();
  await page.getByTestId('cv-field-title').fill('Nguyễn Hoàng Quốc Bảo & Trần Ngọc Thu Hà Phương');
  await page.getByTestId('cv-field-sub').fill('Thứ Bảy, ngày 12 tháng 12 năm 2026 · TP. Hồ Chí Minh');
  await page.waitForTimeout(250);
  await textInside(page, 'tên dài');
  await tpls.nth(5).click();
  await page.getByTestId('cv-field-quote').fill('Gia đình là nơi cuộc sống bắt đầu và tình yêu không bao giờ kết thúc, dù đi đâu xa ta vẫn luôn nhớ về nhà');
  await page.waitForTimeout(250);
  await textInside(page, 'câu nói dài');
  await page.getByTestId('cv-face').screenshot({ path: path.join(OUT, 'cau-noi-dai.png') });

  // 3) khổ × khung × chiều: file in = mặt + 2×(dày khung + 3cm gấp + 1.2cm lề)
  await tpls.nth(0).click();
  const sizes = page.locator('[data-testid="cv-sizes"] button');
  const depths = page.locator('[data-testid="cv-depths"] button');
  const want: Record<string, [number, number]> = { '20×30': [200, 300], '30×40': [300, 400], '40×60': [400, 600], '50×70': [500, 700], '60×90': [600, 900], '30×30 vuông': [300, 300], '50×50 vuông': [500, 500] };
  for (let s = 0; s < await sizes.count(); s++) {
    await sizes.nth(s).click();
    const [w, h] = want[(await sizes.nth(s).innerText()).trim()];
    for (let d = 0; d < 2; d++) {
      await depths.nth(d).click();
      const dep = d === 0 ? 20 : 30;
      const [dim] = await printDims(page);
      expect(dim).toEqual({ w: w + (dep + FOLD + MARK) * 2, h: h + (dep + FOLD + MARK) * 2 });
    }
  }
  // ngang
  await sizes.nth(2).click();
  await page.locator('[data-testid="cv-orient"] button').nth(1).click();
  expect((await printDims(page))[0]).toEqual({ w: 600 + (30 + FOLD + MARK) * 2, h: 400 + (30 + FOLD + MARK) * 2 });
  // 3 kiểu mép đều dựng được
  for (let e = 0; e < 3; e++) {
    await page.locator('[data-testid="cv-edges"] button').nth(e).click();
    await page.getByTestId('cv-show-print').click();
    await page.waitForTimeout(200);
    await page.locator('[data-cv-mode="print"]').first().screenshot({ path: path.join(OUT, `file-in-mep-${e}.png`) });
  }
  await page.locator('[data-testid="cv-orient"] button').nth(0).click();

  // 4) ảnh nhỏ ở khổ lớn → cảnh báo mờ; ảnh lớn ở khổ nhỏ → nét
  await sizes.nth(4).click(); // 60×90
  await page.getByTestId('cv-photo-0').setInputFiles({ name: 'anh-nho.jpg', mimeType: 'image/jpeg', buffer: await jpeg(page, 640, 480) });
  await expect(page.getByTestId('cv-dpi-warn')).toBeVisible({ timeout: 15_000 });
  expect(Number(await page.getByTestId('cv-dpi-0').getAttribute('data-dpi'))).toBeLessThan(75);
  await sizes.nth(0).click(); // 20×30
  await page.getByTestId('cv-photo-0').setInputFiles({ name: 'anh-lon.jpg', mimeType: 'image/jpeg', buffer: await jpeg(page, 3600, 2700) });
  await expect(page.getByTestId('cv-dpi-warn')).toHaveCount(0, { timeout: 15_000 });
  expect(Number(await page.getByTestId('cv-dpi-0').getAttribute('data-dpi'))).toBeGreaterThanOrEqual(120);
  // phóng to → dpi giảm
  const before = Number(await page.getByTestId('cv-dpi-0').getAttribute('data-dpi'));
  await page.getByTestId('cv-zoom-0').fill('2');
  await expect.poll(async () => Number(await page.getByTestId('cv-dpi-0').getAttribute('data-dpi'))).toBeLessThan(before * 0.6);

  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  // 5) file in: PDF 1 trang, JPG đúng khổ
  const pdf1 = fs.readFileSync(await grab('cv-pdf'));
  expect(pdf1.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf1.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(1);
  const jpg = fs.readFileSync(await grab('cv-jpg'));
  expect(jpg[0]).toBe(0xff); expect(jpg[1]).toBe(0xd8);
  expect(jpg.length).toBeGreaterThan(50_000);

  // 6) bộ 3 tấm → 3 trang PDF
  await tpls.nth(n - 1).click();
  await page.waitForTimeout(300);
  expect((await printDims(page)).length).toBe(3);
  const pdf3 = fs.readFileSync(await grab('cv-pdf'));
  expect((pdf3.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(3);

  // 7) 3D: ảnh sản phẩm chụp được (1 tấm + bộ 3 tấm)
  await page.getByTestId('tab-3d').click();
  await expect(page.getByTestId('mockup-3d').locator('canvas')).toBeVisible({ timeout: 30_000 });
  for (const [i, name] of [[n - 1, '3d-bo-3-tam'], [1, '3d-anh-cuoi'], [5, '3d-cau-noi']] as const) {
    await tpls.nth(i).click();
    await page.waitForTimeout(600);
    const url = await page.evaluate(() => (window as unknown as { __cvSnap: (w: number, h: number) => Promise<string> }).__cvSnap(1200, 900));
    expect(url.length).toBeGreaterThan(20_000);
    fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  const shot = fs.readFileSync(await grab('cv-shot'));
  expect(shot.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
