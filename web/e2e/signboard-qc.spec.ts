import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Biển báo · chỉ dẫn: mọi mẫu + mọi loại biển × mọi khổ × vật liệu — chữ nằm trong biển (tránh ốc pát),
// không chồng nhau, không quá nhỏ; QR wifi đúng nội dung; tải PDF (đủ trang cho cả bộ, treo cờ ×2),
// SVG/ZIP có CutContour + Khoan, không còn <text>; 3D dựng được mọi vật liệu; không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'signboard');

type Issue = string;
async function auditPrint(page: Page, label: string): Promise<{ n: number; issues: Issue[] }> {
  return page.evaluate((label) => {
    const issues: string[] = [];
    const svgs = Array.from(document.querySelectorAll('[data-testid="sb-print"] svg')) as SVGSVGElement[];
    svgs.forEach((svg, si) => {
      const vb = svg.viewBox.baseVal; const b = -vb.x; const W = vb.width - b * 2, H = vb.height - b * 2;
      const boxes: { x0: number; x1: number; y0: number; y1: number; t: string }[] = [];
      svg.querySelectorAll('#In text').forEach((el) => {
        const t = el as SVGTextElement; const txt = t.textContent || '';
        if (!txt.trim()) return;
        const bb = t.getBBox(); const fs = parseFloat(t.getAttribute('font-size') || '0'); const y = parseFloat(t.getAttribute('y') || '0');
        const box = { x0: bb.x, x1: bb.x + bb.width, y0: y - fs * 0.74, y1: y + fs * 0.2, t: txt };
        if (box.x0 < -0.5 || box.x1 > W + 0.5 || box.y0 < -0.5 || box.y1 > H + 0.5) issues.push(`${label} #${si} "${txt}" lòi ra ngoài biển`);
        if (fs < 2.5) issues.push(`${label} #${si} "${txt}" quá nhỏ ${fs.toFixed(2)}mm`);
        boxes.push(box);
      });
      // chữ không đè pictogram / ô nền pictogram / QR
      svg.querySelectorAll('#In [data-pic]').forEach((pe) => {
        const pb = (pe as SVGGraphicsElement).getBBox();
        for (const a of boxes) {
          const ox = Math.min(a.x1, pb.x + pb.width) - Math.max(a.x0, pb.x), oy = Math.min(a.y1, pb.y + pb.height) - Math.max(a.y0, pb.y);
          if (ox > 1 && oy > 1) issues.push(`${label} #${si} chữ "${a.t}" đè hình`);
        }
      });
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], c = boxes[j];
        const ox = Math.min(a.x1, c.x1) - Math.max(a.x0, c.x0), oy = Math.min(a.y1, c.y1) - Math.max(a.y0, c.y0);
        if (ox > 0.6 && oy > 0.6) issues.push(`${label} #${si} chồng chữ "${a.t}" × "${c.t}"`);
      }
    });
    return { n: svgs.length, issues };
  }, label);
}

const grab = async (page: Page, id: string) => {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
  const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
};

test('Biển báo · chỉ dẫn: mẫu, bộ biển, khổ, vật liệu, file in, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/signboard');
  const tpls = page.getByTestId('sb-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  await page.getByTestId('tab-flat').click();
  const issues: string[] = [];

  // 1) mọi mẫu (bộ mặc định đi kèm)
  const nT = await tpls.count();
  expect(nT).toBeGreaterThanOrEqual(10);
  for (let i = 0; i < nT; i++) {
    await tpls.nth(i).click(); await page.waitForTimeout(150);
    issues.push(...(await auditPrint(page, `mẫu ${i}`)).issues);
    await page.getByTestId('sb-preview').screenshot({ path: path.join(OUT, `mau-${String(i + 1).padStart(2, '0')}.png`) });
  }

  // 2) tick đủ 15 loại biển → mọi khổ × (mica, treo cờ, dạ quang) × mọi phong cách
  const signs = await page.locator('[data-testid^="sb-set-"]').count();
  for (let i = 0; i < signs; i++) { const cb = page.locator('[data-testid^="sb-set-"]').nth(i); if (!(await cb.isChecked())) await cb.check(); }
  const sizes = page.getByTestId('sb-size');
  for (const mat of ['mica', 'flag', 'glow']) {
    await page.getByTestId(`sb-mat-${mat}`).click();
    for (let z = 0; z < await sizes.count(); z++) {
      await sizes.nth(z).click(); await page.waitForTimeout(120);
      const r = await auditPrint(page, `${mat} khổ ${z}`);
      expect(r.n).toBe(signs);
      issues.push(...r.issues);
    }
  }
  const styles = page.locator('[data-testid="sb-styles"] button');
  await page.getByTestId('sb-mat-mica').click();
  for (let k = 0; k < await styles.count(); k++) {
    await styles.nth(k).click();
    for (const z of [0, 1]) { await sizes.nth(z).click(); await page.waitForTimeout(120); issues.push(...(await auditPrint(page, `style ${k} khổ ${z}`)).issues); }
  }

  // 3) chữ rất dài + song ngữ
  await sizes.nth(3).click(); // 15×15 chật nhất
  for (const id of ['wc', 'staff', 'camera', 'room']) {
    await page.getByTestId(`sb-sign-${id}`).click();
    await page.getByTestId('sb-title').fill('Khu vực dành riêng cho nhân viên kỹ thuật và bảo trì toà nhà');
    await page.getByTestId('sb-en').fill('Authorized maintenance and technical staff only');
  }
  await page.getByTestId('sb-sign-direction').click();
  await page.getByTestId('sb-sub').fill('Phòng họp lớn tầng trệt | trái | Main conference hall\nQuầy lễ tân và thanh toán | phải | Reception & cashier\nThang máy khách | lên | Guest elevator\nBãi giữ xe máy | xuống | Motorbike parking');
  await page.waitForTimeout(200);
  for (let z = 0; z < await sizes.count(); z++) { await sizes.nth(z).click(); await page.waitForTimeout(120); issues.push(...(await auditPrint(page, `dài khổ ${z}`)).issues); }
  await page.getByTestId('sb-preview').screenshot({ path: path.join(OUT, 'chu-dai-chi-huong.png') });

  // 4) QR wifi đúng nội dung
  await page.getByTestId('sb-sign-wifi').click();
  await page.getByTestId('sb-ssid').fill('ThuHa;Cafe');
  await page.getByTestId('sb-pass').fill('pass:2027');
  await page.waitForTimeout(200);
  const qr = await page.locator('[data-testid="sb-preview"] [data-qr]').getAttribute('data-qr');
  expect(qr).toBe('WIFI:T:WPA;S:ThuHa\\;Cafe;P:pass\\:2027;;');

  expect(issues, issues.slice(0, 12).join('\n')).toEqual([]);

  // 5) tải file: bộ 15 biển, mica
  await page.getByTestId('sb-mat-mica').click(); await sizes.nth(0).click(); await page.waitForTimeout(300);
  const pdf = fs.readFileSync(await grab(page, 'sb-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(signs);
  const zipP = await grab(page, 'sb-svg');
  expect(zipP.endsWith('.zip')).toBe(true);
  const zip = fs.readFileSync(zipP).toString('latin1');
  expect((zip.match(/id="CutContour"/g) || []).length).toBe(signs);
  expect((zip.match(/id="Khoan"/g) || []).length).toBe(signs);
  expect(zip).not.toContain('<text');
  const png = fs.readFileSync(await grab(page, 'sb-png'));
  expect(png.readUInt32BE(16)).toBe(1600);

  // treo cờ: 2 mặt → gấp đôi số trang; bộ 1 biển → SVG đơn
  for (let i = 0; i < signs; i++) { const cb = page.locator('[data-testid^="sb-set-"]').nth(i); if (await cb.isChecked() && i > 0) await cb.uncheck(); }
  await page.getByTestId('sb-mat-flag').click(); await page.waitForTimeout(300);
  const setN = await page.locator('[data-testid="sb-print"] svg').count();
  const pdf2 = fs.readFileSync(await grab(page, 'sb-pdf')).toString('latin1');
  expect((pdf2.match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(setN * 2);
  if (setN === 1) {
    const svg = fs.readFileSync(await grab(page, 'sb-svg'), 'utf8');
    expect(svg).toContain('id="CutContour"'); expect(svg).toContain('id="Khoan"'); expect(svg).not.toContain('<text');
  }

  // 6) 3D mọi vật liệu
  for (const [i, mat] of (['mica', 'alu', 'glow', 'flag'] as const).entries()) {
    await page.getByTestId(`sb-mat-${mat}`).click(); await page.waitForTimeout(600);
    const u = await page.evaluate(() => (window as unknown as { __sbSnap: (w: number, h: number) => Promise<string> }).__sbSnap(1200, 900));
    expect(u.length).toBeGreaterThan(20_000);
    fs.writeFileSync(path.join(OUT, `3d-${i}-${mat}.png`), Buffer.from(u.split(',')[1], 'base64'));
  }
  await page.getByTestId('tab-3d').click();
  await page.waitForTimeout(2500);
  const p3 = fs.readFileSync(await grab(page, 'sb-3d-png'));
  expect(p3.readUInt32BE(16)).toBe(1600);
  await expect(page.getByTestId('print-request')).toBeVisible();
  expect(errors).toEqual([]);
});
