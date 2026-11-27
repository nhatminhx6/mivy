import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { strFromU8, unzipSync } from 'fflate';

test('Studio cardecal: mẫu, khổ, chữ dài, bản in và ảnh 3D', async ({page}) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/studio/cardecal');
  await page.getByTestId('tab-flat').click();

  const templates = page.getByTestId('cd-tpl');
  const preview = page.getByTestId('cd-preview').locator(':scope > svg');
  const sizes = page.getByLabel('Dòng xe', {exact:true});
  const field = page.locator('[data-testid^="cd-field-"]').first();

  for (const template of await templates.all()) {
    await template.click();
    const options = await sizes.locator('option').evaluateAll((items) =>
      items.map((item) => (item as HTMLOptionElement).value));
    for (const option of options) {
      await sizes.selectOption(option);
      await expect(preview).toBeVisible();
      const invalid = await preview.evaluate((svg) => {
        const box = (svg as SVGSVGElement).viewBox.baseVal;
        const ctm = (svg as SVGSVGElement).getScreenCTM();
        if (!ctm || box.width <= 0 || box.height <= 0) return ['viewBox'];
        const invert = ctm.inverse();
        return [...svg.querySelectorAll('text')].flatMap((item) => {
          if (item.closest('defs, mask, clipPath, [data-knock]')) return [];
          const {left, top, right, bottom} = item.getBoundingClientRect();
          const p = new DOMPoint(left, top).matrixTransform(invert);
          const q = new DOMPoint(right, bottom).matrixTransform(invert);
          const tolerance = Math.max(box.width, box.height) * .02;
          return p.x < box.x-tolerance || p.y < box.y-tolerance
            || q.x > box.x+box.width+tolerance || q.y > box.y+box.height+tolerance
            ? [item.textContent] : [];
        });
      });
      expect(invalid, await template.innerText()).toEqual([]);
    }
  }

  await templates.first().click();
  const sampleValue = await field.inputValue();
  await field.fill('CỬA HÀNG QUỐC BẢO · '.repeat(8));
  await expect(preview).toBeVisible();
  await expect(page.getByTestId('print-request')).toBeVisible();
  const out = path.resolve(process.env.QC_OUT ?? '../output/cardecal/qc');
  await mkdir(out, {recursive:true});

  const svgDownload = page.waitForEvent('download');
  await page.getByTestId('cd-svg').click();
  const svg = await svgDownload;
  const svgPath = path.join(out, svg.suggestedFilename());
  await svg.saveAs(svgPath);
  const bytes = await readFile(svgPath);
  const svgs = svgPath.endsWith('.zip') ? Object.values(unzipSync(bytes)).map((content) => strFromU8(content)) : [bytes.toString()];
  expect(svgs.some((file) => file.includes('id="CutContour"'))).toBeTruthy();
  for (const file of svgs) {
    expect(file).toContain('<svg');
    expect(file).not.toMatch(/<text[\s>]/);
  }

  const pdfDownload = page.waitForEvent('download');
  await page.getByRole('button', {name:'PDF in', exact:true}).click();
  const pdf = await pdfDownload;
  const pdfPath = path.join(out, pdf.suggestedFilename());
  await pdf.saveAs(pdfPath);
  const pdfBuffer = await readFile(pdfPath);
  const pdfs = pdfPath.endsWith('.zip') ? Object.values(unzipSync(pdfBuffer)) : [pdfBuffer];
  expect(pdfs.length).toBeGreaterThan(0);
  for (const file of pdfs) expect(Buffer.from(file.subarray(0,4)).toString()).toBe('%PDF');

  await field.fill(sampleValue);
  await page.getByTestId('tab-3d').click();
  await expect(page.getByTestId('mockup-3d').locator('canvas')).toHaveCount(1);
  const capture = page.waitForEvent('download');
  await page.getByRole('button', {name:'Ảnh 3D', exact:true}).click();
  const png = await capture;
  const pngPath = path.join(out, png.suggestedFilename());
  await png.saveAs(pngPath);
  const image = await readFile(pngPath);
  expect(image.readUInt32BE(16)).toBe(1600);
  expect(image.readUInt32BE(20)).toBe(1200);
  await templates.last().click();
  await expect(page.getByTestId('mockup-3d').getByText('Kéo để xoay')).toBeVisible({timeout:30_000});
  const alternate = await page.evaluate(async () => {
    const capture = (window as Window & {__cdSnap?: (w: number, h: number) => Promise<string>}).__cdSnap;
    if (!capture) throw new Error('Thiếu hook chụp 3D trong dev server.');
    return capture(1400, 1050);
  });
  const alternateImage = Buffer.from(alternate.split(',')[1], 'base64');
  expect(alternateImage.readUInt32BE(16)).toBe(1400);
  await writeFile(path.join(out, 'cardecal-mau-khac-3d.png'), alternateImage);
  expect(errors).toEqual([]);
});
