import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Sổ tay in logo: 3 loại × mọi mẫu × mọi khổ — chữ bìa trước/sau + trang ruột nằm trong khổ, không đè nhau;
// chữ dài vẫn vừa; logo tải lên hiện ở bìa; gáy trên; PDF bìa đúng số trang theo loại, PDF ruột 1 trang,
// PNG 1600px, SVG đã outline, ảnh 3D 1600px, không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'notebook');

async function audit(page: Page, label: string) {
  const r = await page.evaluate(() => {
    const roles = ['view-front', 'view-inner', 'view-inner-left'];
    const out: { role: string; W: number; H: number; bad: string[]; overlaps: string[]; n: number }[] = [];
    for (const role of roles) {
      const svg = document.querySelector(`[data-role="${role}"] svg`) as SVGSVGElement | null;
      if (!svg) continue;
      const vb = svg.viewBox.baseVal;
      const texts = Array.from(svg.querySelectorAll('text')).filter((t) => (t.textContent || '').trim());
      const boxes = texts.map((t) => ({ t: (t.textContent || '').trim().slice(0, 30), b: t.getBBox() }));
      const bad = boxes.filter(({ b }) => b.x < vb.x - 0.6 || b.y < vb.y - 0.6 || b.x + b.width > vb.x + vb.width + 0.6 || b.y + b.height > vb.y + vb.height + 0.6).map((x) => x.t);
      const overlaps: string[] = [];
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i].b, c = boxes[j].b;
        // so theo thân chữ (bỏ phần dấu trên/đuôi dưới ~22% chiều cao mỗi dòng)
        const ix = Math.min(a.x + a.width, c.x + c.width) - Math.max(a.x, c.x);
        const iy = Math.min(a.y + a.height * 0.8, c.y + c.height * 0.8) - Math.max(a.y + a.height * 0.22, c.y + c.height * 0.22);
        if (ix > 0.4 && iy > 0.4) overlaps.push(`${boxes[i].t} × ${boxes[j].t}`);
      }
      out.push({ role, W: vb.width, H: vb.height, bad, overlaps, n: texts.length });
    }
    return out;
  });
  for (const x of r) {
    expect(x.bad, `${label} ${x.role}: chữ tràn ra ngoài khổ`).toEqual([]);
    expect(x.overlaps, `${label} ${x.role}: chữ đè nhau`).toEqual([]);
  }
  const front = r.find((x) => x.role === 'view-front')!;
  expect(front.n, `${label}: bìa có chữ`).toBeGreaterThan(0);
  return r;
}

const grab = async (page: Page, id: string) => {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
  const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return { p, buf: fs.readFileSync(p) };
};
const pdfPages = (b: Buffer) => (b.toString('latin1').match(/\/Type \/Page[^s]/g) || []).length;

test('Sổ tay: 3 loại × mọi mẫu × khổ, file in, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/notebook');
  const tpls = page.getByTestId('nb-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  await expect(page.locator('[data-testid="mockup-3d"] canvas').first()).toBeVisible({ timeout: 60_000 });

  const expectPages: Record<string, number> = { wire: 2, leather: 2, kraft: 1 };
  let total = 0;
  for (const kind of ['wire', 'leather', 'kraft']) {
    await page.getByTestId(`nb-kind-${kind}`).click();
    await page.waitForTimeout(300);
    const n = await tpls.count();
    const sizes = page.locator('[data-testid="nb-sizes"] button');
    for (let i = 0; i < n; i++) {
      await tpls.nth(i).click();
      for (let s = 0; s < await sizes.count(); s++) {
        await sizes.nth(s).click();
        await page.waitForTimeout(60);
        await audit(page, `${kind} mẫu ${i} khổ ${s}`);
        total++;
      }
    }
    // gáy trên (lò xo) + các kiểu ruột
    if (kind === 'wire') {
      await page.locator('[data-testid="nb-binds"] button').nth(1).click();
      for (let rr = 0; rr < 4; rr++) { await page.locator('[data-testid="nb-rules"] button').nth(rr).click(); await audit(page, `wire gáy trên ruột ${rr}`); }
      await page.locator('[data-testid="nb-binds"] button').nth(0).click();
    }
    // chữ dài
    await tpls.nth(0).click();
    await page.getByTestId('nb-brand').fill('CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ XUẤT NHẬP KHẨU AN KHANG PHÁT');
    await page.getByTestId('nb-title').fill('Sổ tay kế hoạch kinh doanh và chăm sóc khách hàng 2027');
    await page.getByTestId('nb-slogan').fill('Uy tín tạo nên thương hiệu, chất lượng làm nên sự khác biệt bền vững');
    for (let i = 0; i < n; i++) { await tpls.nth(i).click(); await audit(page, `${kind} mẫu ${i} chữ dài`); }
    await page.screenshot({ path: path.join(OUT, `nb-${kind}-grid.png`), fullPage: false });

    // tải file
    const cover = await grab(page, 'nb-pdf-cover');
    expect(cover.buf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdfPages(cover.buf), `${kind}: số trang PDF bìa`).toBe(expectPages[kind]);
    const inner = await grab(page, 'nb-pdf-inner');
    expect(pdfPages(inner.buf)).toBe(1);
    const png = await grab(page, 'nb-png');
    expect(png.buf.readUInt32BE(16)).toBe(1600);
    const svg = await grab(page, 'nb-svg');
    expect(svg.buf.toString()).not.toContain('<text');
    // 3D: chụp góc mặc định để soi
    const shot = await page.evaluate(() => (window as unknown as { __nbSnap: (w: number, h: number) => Promise<string> }).__nbSnap(1400, 1050));
    fs.writeFileSync(path.join(OUT, `nb-${kind}-3d.png`), Buffer.from(shot.split(',')[1], 'base64'));
    // trả nội dung mẫu cho loại sau
    await page.reload();
    await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  }
  expect(total).toBeGreaterThanOrEqual(20);

  // logo tải lên: hiện ở bìa (image hoặc mask)
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 240; c.height = 240;
    const x = c.getContext('2d')!; x.fillStyle = '#1F3A68'; x.beginPath(); x.arc(120, 120, 100, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#fff'; x.fillRect(80, 80, 80, 80);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.getByTestId('nb-logo-input').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') });
  await expect(page.locator('[data-role="view-front"] svg image').first()).toBeAttached({ timeout: 10_000 });
  await page.getByTestId('nb-kind-leather').click();
  await expect(page.locator('[data-role="print-mask"] svg mask image').first()).toBeAttached({ timeout: 10_000 });
  await audit(page, 'logo da');

  // ảnh 3D tải về
  await page.getByTestId('tab-3d').click();
  await page.waitForTimeout(2500);
  const p3d = await grab(page, 'nb-3d');
  expect(p3d.buf.readUInt32BE(16)).toBe(1600);
  await expect(page.getByTestId('print-request')).toBeVisible();
  expect(errors).toEqual([]);
});
