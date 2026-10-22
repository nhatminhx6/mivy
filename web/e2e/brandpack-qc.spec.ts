import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { unzipSync } from 'fflate';

// QC trang Bộ nhận diện (brandpack): 12 ấn phẩm vẽ sạch (chữ không bị cắt/lòi, chữ chạy vòng không mất chữ),
// xem lớn, ZIP đủ 25 file đúng kích thước + đúng thư mục. Chạy với: có bộ nhận diện + logo, tên dài, chưa có gì.

const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'brandpack');
const SIZES: Record<string, [number, number]> = {
  'brand-board': [1600, 1200], 'avatar-nen-sang': [1000, 1000], 'avatar-nen-toi': [1000, 1000], 'bia-facebook': [1640, 624],
  'highlight-san-pham': [1080, 1080], 'highlight-feedback': [1080, 1080], 'highlight-uu-dai': [1080, 1080], 'highlight-lien-he': [1080, 1080],
  'namecard-mat-truoc': [1050, 600], 'namecard-mat-sau': [1050, 600], 'tem-dan-hop': [1000, 1000], 'thiep-cam-on': [1748, 1240],
};
const pngWH = (b: Uint8Array) => { const d = new DataView(b.buffer, b.byteOffset); return [d.getUint32(16), d.getUint32(20)]; };

async function setKit(page: Page, name: string) {
  await page.goto('/studio/brandpack');
  await page.evaluate((name) => {
    const c = document.createElement('canvas'); c.width = 600; c.height = 300;
    const x = c.getContext('2d')!;
    x.fillStyle = '#b91c1c'; x.beginPath(); x.arc(150, 150, 120, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#111827'; x.font = 'bold 90px Arial'; x.fillText('CÔ BA', 290, 185);
    localStorage.setItem('mivy-brand-v1', JSON.stringify({
      name, slogan: 'Ngon từ tâm', logo: c.toDataURL('image/png'),
      colorPrimary: '#3a0d0d', colorSecondary: '#7a1f1f', colorAccent: '#e23d28', colorInk: '#1a0e0e', colorSurface: '#fdf1ef',
      fontHeadingId: 'playfair', fontBodyId: 'be-vietnam', voice: 'than-thien',
      contact: { phone: '0909 000 111', facebook: 'fb.com/banhmicoba', address: '12 Lê Lợi, Q.1, TP.HCM' },
    }));
  }, name);
  await page.reload();
}

async function checkAssets(page: Page, tag: string) {
  await expect(page.getByTestId('asset-tile')).toHaveCount(12, { timeout: 60_000 });
  await page.waitForTimeout(600);
  const issues = await page.evaluate(() => {
    const out: string[] = [];
    document.querySelectorAll('[data-asset]').forEach((node, i) => {
      const nr = node.getBoundingClientRect();
      if (node.innerHTML.includes('NaN')) out.push(`#${i} NaN`);
      node.querySelectorAll('img').forEach((im) => { if (!(im as HTMLImageElement).complete || !(im as HTMLImageElement).naturalWidth) out.push(`#${i} ảnh lỗi`); });
      node.querySelectorAll('*').forEach((el) => {
        const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent!.trim());
        if (!own || el.closest('svg')) return;
        const r = el.getBoundingClientRect();
        // khung cắt gần nhất (ancestor overflow hidden) hoặc chính ấn phẩm
        let clip = nr;
        for (let p = el.parentElement; p && p !== node; p = p.parentElement) if (getComputedStyle(p).overflow !== 'visible') { clip = p.getBoundingClientRect(); break; }
        if (r.left < clip.left - 1 || r.right > clip.right + 1 || r.top < clip.top - 1 || r.bottom > clip.bottom + 1) out.push(`#${i} chữ lòi/cắt: "${el.textContent!.trim().slice(0, 30)}"`);
        const cs = getComputedStyle(el);
        if (cs.textOverflow === 'ellipsis' && (el as HTMLElement).scrollWidth > (el as HTMLElement).clientWidth + 1) out.push(`#${i} chữ bị rút gọn "…": "${el.textContent!.trim().slice(0, 30)}"`);
      });
      // chữ chạy vòng (textPath) dài hơn đường → bị cắt im lặng
      node.querySelectorAll('textPath').forEach((tp) => {
        const p = document.querySelector((tp.getAttribute('href') || '')) as SVGPathElement | null;
        const t = tp.parentElement as unknown as SVGTextElement;
        if (p && t.getComputedTextLength() > p.getTotalLength() * 0.98) out.push(`#${i} chữ vòng bị cắt: "${tp.textContent}"`);
      });
    });
    return out;
  });
  expect(issues, tag).toEqual([]);
}

test('Bộ nhận diện: có kit + logo — ấn phẩm sạch, xem lớn, ZIP đủ', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT, { recursive: true });
  await setKit(page, 'Bánh Mì Cô Ba');
  await expect(page.getByTestId('pack-name')).toHaveValue('Bánh Mì Cô Ba');
  await expect(page.getByText('Chưa có logo')).toHaveCount(0);
  await checkAssets(page, 'có kit');

  await page.getByRole('button', { name: 'Xem lớn Bìa Facebook' }).click();
  const lb = page.getByTestId('lightbox');
  await expect(lb).toContainText('Bìa Facebook');
  expect(await lb.locator('img').evaluate((im: HTMLImageElement) => im.decode().then(() => im.naturalWidth))).toBe(1640);
  await page.keyboard.press('Escape');
  await expect(lb).toBeHidden();

  await expect(page.locator('[data-testid="mockup-tile"] canvas[data-ready="1"]')).toHaveCount(6, { timeout: 60_000 });
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 180_000 }), page.getByRole('button', { name: /Tải trọn bộ/ }).click()]);
  const zp = path.join(OUT, dl.suggestedFilename());
  await dl.saveAs(zp);
  const files = unzipSync(new Uint8Array(fs.readFileSync(zp)));
  const names = Object.keys(files);
  expect(names.length, names.join('\n')).toBe(25);
  for (const [id, wh] of Object.entries(SIZES)) {
    const n = names.find((x) => x.endsWith(`-${id}.png`));
    expect(n, `thiếu ${id}`).toBeTruthy();
    expect(pngWH(files[n!]), id).toEqual(wh);
    fs.writeFileSync(path.join(OUT, path.basename(n!)), files[n!]);
  }
  expect(names.filter((n) => n.startsWith('01-logo/'))).toHaveLength(3);
  expect(names.filter((n) => n.startsWith('04-mockup/'))).toHaveLength(9);
  expect(new TextDecoder().decode(files['bang-mau-va-font.txt'])).toContain('#E23D28'.toLowerCase());
});

test('Bộ nhận diện: tên dài vẫn sạch', async ({ page }) => {
  test.setTimeout(120_000);
  await setKit(page, 'Tiệm Bánh Ngọt Nhà Mây Xanh Đà Lạt');
  await checkAssets(page, 'tên dài');
});

test('Bộ nhận diện: chưa có gì — logo chữ tạm + gợi ý tạo logo', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/studio/brandpack');
  await expect(page.getByText('Chưa có logo')).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('pack-name').fill('Mộc');
  await checkAssets(page, 'chưa có kit');
  expect(await page.locator('[data-asset] svg[data-logo-kind]').count()).toBeGreaterThan(5);
});
