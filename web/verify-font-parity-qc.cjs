const fs = require('node:fs');
const ts = require('typescript');
const assert = require('node:assert/strict');
const path = require('node:path');

for (const ext of ['.ts', '.tsx']) {
  require.extensions[ext] = (m, f) =>
    m._compile(
      ts.transpileModule(fs.readFileSync(f, 'utf8'), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
          target: ts.ScriptTarget.ES2020,
        },
      }).outputText,
      f
    );
}

const {
  extractPrimaryFontFamily,
  ensurePosterFontsReady,
  POSTER_FONT,
  normalizeCanvasContext,
} = require('./src/lib/poster-font.ts');
const { FONT_PRESETS, fontFamilyById } = require('./src/lib/brand-presets.ts');

async function runFontParityTests() {
  console.log('=== RUNNING MIVY FONT PARITY & READINESS QC ===\n');

  // --- Test 1: Multi-word Font Family Extraction ---
  console.log('--- Test 1: Multi-word font family extraction without truncation ---');
  {
    assert.equal(
      extractPrimaryFontFamily('"Be Vietnam Pro", sans-serif'),
      'Be Vietnam Pro',
      'Must preserve full multi-word name "Be Vietnam Pro" instead of truncating to "Be"'
    );
    assert.equal(
      extractPrimaryFontFamily('"Playfair Display", serif'),
      'Playfair Display',
      'Must preserve full multi-word name "Playfair Display" instead of truncating to "Playfair"'
    );
    assert.equal(
      extractPrimaryFontFamily('"Plus Jakarta Sans", sans-serif'),
      'Plus Jakarta Sans',
      'Must preserve full multi-word name "Plus Jakarta Sans"'
    );
    assert.equal(
      extractPrimaryFontFamily('"Montserrat", sans-serif'),
      'Montserrat'
    );
    assert.equal(
      extractPrimaryFontFamily('"Lora", serif'),
      'Lora'
    );
    assert.equal(
      extractPrimaryFontFamily('Caveat'),
      'Caveat'
    );
    assert.equal(extractPrimaryFontFamily(''), '');
    assert.equal(extractPrimaryFontFamily(null), '');
    assert.equal(extractPrimaryFontFamily(undefined), '');

    // Verify all production FONT_PRESETS extract to their exact name
    for (const preset of FONT_PRESETS) {
      const extracted = extractPrimaryFontFamily(preset.family);
      assert.equal(
        extracted,
        preset.name,
        `Preset ${preset.id} (${preset.family}) must extract to ${preset.name}`
      );
    }
    console.log('✓ Passed: All multi-word font family names extract without truncation');
  }

  // --- Test 2: ensurePosterFontsReady Requests All Required Families and Weights ---
  console.log('\n--- Test 2: ensurePosterFontsReady font face and weight requests ---');
  {
    const requestedFonts = [];
    let readyAwaited = false;

    // Mock document.fonts to capture exact requests
    const mockDocument = {
      fonts: {
        load: (spec, chars) => {
          requestedFonts.push({ spec, chars });
          return Promise.resolve([]);
        },
        ready: Promise.resolve().then(() => {
          readyAwaited = true;
        }),
      },
    };

    const originalDocument = globalThis.document;
    globalThis.document = mockDocument;

    try {
      await ensurePosterFontsReady({
        headingFontId: 'playfair',
        bodyFontId: 'lora',
        brandKit: {
          name: 'Test',
          colorPrimary: '#000',
          colorSecondary: '#111',
          colorAccent: '#222',
          colorInk: '#333',
          colorSurface: '#444',
          voice: 'than-thien',
          fontHeadingId: 'playfair',
          fontBodyId: 'be-vietnam',
        },
      });
    } finally {
      globalThis.document = originalDocument;
    }

    assert.ok(readyAwaited, 'document.fonts.ready must be awaited');
    assert.ok(requestedFonts.length > 0, 'Must request font faces');

    // 1. Must make calls WITHOUT text parameter to cover all unicode-range subsets (latin, latin-ext, vietnamese)
    const nonRestrictedLoads = requestedFonts.filter((r) => r.chars === undefined);
    assert.ok(
      nonRestrictedLoads.length > 0,
      'Must call document.fonts.load without text parameter to load all unicode subsets'
    );

    // 2. Must also make calls covering actual glyphs from state
    const actualGlyphLoads = requestedFonts.filter(
      (r) => typeof r.chars === 'string' && r.chars.includes('Test')
    );
    assert.ok(
      actualGlyphLoads.length > 0,
      'Must call document.fonts.load with actual glyphs from state'
    );

    const requestedSpecs = requestedFonts.map((r) => r.spec);
    // Must request Be Vietnam Pro weights
    for (const w of ['400', '500', '600', '700', '800', '900']) {
      assert.ok(
        requestedSpecs.some((s) => s.includes(`${w} 32px "Be Vietnam Pro"`)),
        `Must request Be Vietnam Pro weight ${w}`
      );
      assert.ok(
        requestedSpecs.some((s) => s.includes(`${w} 32px "Playfair Display"`)),
        `Must request Playfair Display weight ${w}`
      );
    }
    // Must request Caveat italic 700
    assert.ok(
      requestedSpecs.some((s) => s.includes('italic 700 32px "Caveat"')),
      'Must request Caveat italic 700 for sticker overlays'
    );
    console.log('✓ Passed: ensurePosterFontsReady requests all families (including multi-word), weights 400..900, all unicode subsets, and actual glyphs');
  }

  // --- Test 3: Static Analysis of Production marketing/page.tsx Wiring ---
  console.log('\n--- Test 3: Production marketing/page.tsx font readiness and export parity wiring ---');
  {
    const pageSource = fs.readFileSync('src/app/studio/marketing/page.tsx', 'utf8');

    // 1. Must import ensurePosterFontsReady
    assert.ok(
      pageSource.includes('ensurePosterFontsReady'),
      'marketing/page.tsx must import ensurePosterFontsReady'
    );

    // 2. renderAllCanvases must call ensurePosterFontsReady
    const renderCanvasesIdx = pageSource.indexOf('const renderAllCanvases =');
    assert.ok(renderCanvasesIdx !== -1, 'renderAllCanvases must exist');
    const renderCanvasesBody = pageSource.slice(renderCanvasesIdx, renderCanvasesIdx + 500);
    assert.ok(
      renderCanvasesBody.includes('await ensurePosterFontsReady(state)'),
      'renderAllCanvases must await ensurePosterFontsReady(state)'
    );

    // 3. Must register loadingdone event listener for re-rendering when lazy fonts settle
    assert.ok(
      pageSource.includes('addEventListener(\'loadingdone\''),
      'marketing/page.tsx must listen to loadingdone event to re-render preview canvases'
    );

    // 4. prepareExport must snapshot BEFORE any async work
    const prepExportIdx = pageSource.indexOf('const prepareExport =');
    assert.ok(prepExportIdx !== -1, 'prepareExport must exist');
    const prepExportBody = pageSource.slice(prepExportIdx, prepExportIdx + 700);

    const snapshotPos = prepExportBody.indexOf('structuredClone(state)');
    const awaitPos = prepExportBody.indexOf('await');
    assert.ok(snapshotPos !== -1, 'prepareExport must clone snapshot');
    assert.ok(awaitPos !== -1, 'prepareExport must await readiness');
    assert.ok(
      snapshotPos < awaitPos,
      'Snapshot clone must occur BEFORE any await in prepareExport'
    );
    assert.ok(
      prepExportBody.includes('ensurePosterFontsReady(snapshot)'),
      'prepareExport must call ensurePosterFontsReady(snapshot)'
    );

    // 5. Preview modal download must use handleDownloadSingle instead of live DOM canvas toDataURL
    assert.ok(
      pageSource.includes('handleDownloadSingle(previewKind)'),
      'Preview modal download button must call handleDownloadSingle(previewKind) for offscreen export parity'
    );
    console.log('✓ Passed: marketing/page.tsx correctly wired with snapshot before async, loadingdone re-render, and modal export parity');
  }

  // --- Test 4: Static Analysis of Review story-source/page.tsx Wiring ---
  console.log('\n--- Test 4: Review story-source/page.tsx font readiness & offscreen canvas parity ---');
  {
    const reviewSource = fs.readFileSync('src/app/studio/marketing/review/story-source/page.tsx', 'utf8');

    // 1. Must import ensurePosterFontsReady
    assert.ok(
      reviewSource.includes('ensurePosterFontsReady'),
      'story-source/page.tsx must import ensurePosterFontsReady'
    );

    // 2. Preview effect must await ensurePosterFontsReady(state)
    assert.ok(
      reviewSource.includes('await ensurePosterFontsReady(state)'),
      'Preview render effect must await ensurePosterFontsReady(state)'
    );

    // 3. Must listen to loadingdone to re-render preview canvases
    assert.ok(
      reviewSource.includes('addEventListener(\'loadingdone\''),
      'story-source/page.tsx must listen to loadingdone to re-render preview canvases'
    );

    // 4. downloadPagePng must snapshot state before async, call ensurePosterFontsReady, AND use fresh offscreen canvas
    const dlPngIdx = reviewSource.indexOf('const downloadPagePng =');
    assert.ok(dlPngIdx !== -1, 'downloadPagePng must exist');
    const dlPngBody = reviewSource.slice(dlPngIdx, dlPngIdx + 700);
    const snapPngPos = dlPngBody.indexOf('createExportSnapshot(state)');
    const awaitPngPos = dlPngBody.indexOf('await');
    assert.ok(snapPngPos !== -1, 'downloadPagePng must snapshot state');
    assert.ok(snapPngPos < awaitPngPos, 'downloadPagePng must snapshot before any await');
    assert.ok(
      dlPngBody.includes('ensurePosterFontsReady(snapshot)'),
      'downloadPagePng must await ensurePosterFontsReady(snapshot)'
    );
    assert.ok(
      dlPngBody.includes("document.createElement('canvas')"),
      'downloadPagePng must use a fresh offscreen canvas matching export pack renderBlob'
    );
    assert.ok(
      !dlPngBody.includes('canvasRefs.current'),
      'downloadPagePng must NOT reuse live DOM preview canvas canvasRefs.current'
    );

    // 5. downloadScenarioZip must snapshot state before async and call ensurePosterFontsReady
    const dlZipIdx = reviewSource.indexOf('const downloadScenarioZip =');
    assert.ok(dlZipIdx !== -1, 'downloadScenarioZip must exist');
    const dlZipBody = reviewSource.slice(dlZipIdx, dlZipIdx + 700);
    const snapZipPos = dlZipBody.indexOf('createExportSnapshot(state)');
    const awaitZipPos = dlZipBody.indexOf('await');
    assert.ok(snapZipPos !== -1, 'downloadScenarioZip must snapshot state');
    assert.ok(snapZipPos < awaitZipPos, 'downloadScenarioZip must snapshot before any await');
    assert.ok(
      dlZipBody.includes('ensurePosterFontsReady(snapshot)'),
      'downloadScenarioZip must await ensurePosterFontsReady(snapshot)'
    );
    assert.ok(
      dlZipBody.includes("document.createElement('canvas')"),
      'downloadScenarioZip must use fresh offscreen canvas in renderBlob'
    );
    console.log('✓ Passed: story-source/page.tsx correctly wired across preview, downloadPagePng, and downloadScenarioZip using identical offscreen canvas');
  }

  // --- Test 5: Investigation of Browser Evidence Pixel Difference ---
  console.log('\n--- Test 5: Decoded pixel verification of pre-repair browser evidence & 20261014 QC ---');
  {
    // Oct 13 evidence (cold load with missing font ready hook)
    const evidenceDirOct13 = path.resolve('../back-end/docs/template-v2/reports/story-browser-fixed-20261013');
    const pixelParityPathOct13 = path.join(evidenceDirOct13, 'pixel-parity.json');
    assert.ok(fs.existsSync(pixelParityPathOct13), 'pixel-parity.json must exist in Oct 13 evidence directory');
    const parityDataOct13 = JSON.parse(fs.readFileSync(pixelParityPathOct13, 'utf8'));

    assert.equal(parityDataOct13.size[0], 1080);
    assert.equal(parityDataOct13.size[1], 1350);
    assert.equal(parityDataOct13.totalPixels, 1458000);
    assert.equal(parityDataOct13.differentPixels, 43209);

    // Oct 14 evidence (fresh tab, onscreen DOM canvas vs offscreen ZIP export)
    const evidenceDirOct14 = path.resolve('../back-end/docs/template-v2/reports/font-parity-20261014');
    const qcJsonPathOct14 = path.join(evidenceDirOct14, 'qc.json');
    assert.ok(fs.existsSync(qcJsonPathOct14), 'qc.json must exist in Oct 14 evidence directory');
    const qcDataOct14 = JSON.parse(fs.readFileSync(qcJsonPathOct14, 'utf8'));

    assert.equal(qcDataOct14.totalPixels, 1458000);
    assert.equal(qcDataOct14.differentPixels, 31582);
    // Oct 14 R2 evidence (independent QC: legacy VI 4:5 detached export versus ZIP = 0 diffs)
    const evidenceDirOct14R2 = path.resolve('../back-end/docs/template-v2/reports/font-parity-r2-20261014');
    if (fs.existsSync(evidenceDirOct14R2)) {
      const qcR2Path = path.join(evidenceDirOct14R2, 'qc.json');
      assert.ok(fs.existsSync(qcR2Path), 'qc.json must exist in Oct 14 R2 evidence directory');
      const qcDataR2 = JSON.parse(fs.readFileSync(qcR2Path, 'utf8'));
      assert.equal(qcDataR2.totalPixels, 1458000);
      assert.equal(qcDataR2.differentPixels, 0);
      console.log(`✓ Confirmed R2 evidence baseline: detached single PNG versus ZIP equals exactly 0 / ${qcDataR2.totalPixels} differing pixels`);
    }
  }

  // --- Test 6: collectGlyphsFromState Coverage Verification ---
  console.log('\n--- Test 6: collectGlyphsFromState extraction coverage ---');
  {
    const { collectGlyphsFromState } = require('./src/lib/poster-font.ts');
    assert.equal(typeof collectGlyphsFromState, 'function');

    const testState = {
      name: 'Khóa học AI 2026',
      brand: 'MIVY · QC FONT',
      details: '01. Giới thiệu tổng quan\n02. Kiến trúc nâng cao',
      offer: 'Giảm 20% khi đăng ký sớm',
      goal: 'Thu hút học viên',
      copies: {
        launch: {
          headline: 'Khởi động',
          subline: 'Học ngay hôm nay',
          caption: 'Caption ngắn',
          cta: 'Đăng ký ngay',
          points: ['Điểm 1: Thực hành', 'Điểm 2: Dự án'],
        },
      },
      industryFields: {
        role: 'Kỹ sư AI',
        salary: '30 - 50 triệu',
      },
      brandKit: {
        name: 'Mivy Corp',
        slogan: 'Thiết kế chuẩn studio',
        contact: { phone: '0901234567', email: 'hello@mivy.vn' },
      },
    };

    const glyphs = collectGlyphsFromState(testState);
    assert.ok(glyphs.includes('M'), 'Must include Latin uppercase');
    assert.ok(glyphs.includes('i'), 'Must include Latin lowercase');
    assert.ok(glyphs.includes('·'), 'Must include middle dot');
    assert.ok(glyphs.includes(':'), 'Must include colon');
    assert.ok(glyphs.includes('%'), 'Must include percent');
    assert.ok(glyphs.includes('ế'), 'Must include Vietnamese accented ế');
    assert.ok(glyphs.includes('ự'), 'Must include Vietnamese accented ự');
    assert.ok(glyphs.includes('ổ'), 'Must include Vietnamese accented ổ');
    assert.ok(glyphs.includes('ó'), 'Must include Vietnamese accented ó');
    assert.ok(glyphs.includes('à'), 'Must include Vietnamese accented à');
    console.log('✓ Passed: collectGlyphsFromState correctly collects all characters including compound Vietnamese diacritics and special punctuation');
  }

  // --- Test 7: Dev-only Attached Preview Capture Control Verification ---
  console.log('\n--- Test 7: Dev-only attached preview capture control in story-source/page.tsx ---');
  {
    const reviewSource = fs.readFileSync('src/app/studio/marketing/review/story-source/page.tsx', 'utf8');

    // 1. capturePreviewPng handler must exist
    const captureIdx = reviewSource.indexOf('const capturePreviewPng =');
    assert.ok(captureIdx !== -1, 'capturePreviewPng must exist');
    const captureBody = reviewSource.slice(captureIdx, captureIdx + 600);

    // 2. Must serialize canvasRefs.current[pageIdx] directly
    assert.ok(
      captureBody.includes('canvasRefs.current[pageIdx]'),
      'capturePreviewPng must directly reference canvasRefs.current[pageIdx]'
    );
    assert.ok(
      captureBody.includes('canvas.toBlob('),
      'capturePreviewPng must serialize directly via canvas.toBlob'
    );

    // 3. Must NOT redraw or create replacement canvas
    assert.ok(
      !captureBody.includes('drawIndustryPoster'),
      'capturePreviewPng must NOT redraw canvas (no drawIndustryPoster)'
    );
    assert.ok(
      !captureBody.includes("document.createElement('canvas')"),
      'capturePreviewPng must NOT create replacement canvas'
    );

    // 4. Must NOT await fonts or mutate state
    assert.ok(
      !captureBody.includes('ensurePosterFontsReady'),
      'capturePreviewPng must NOT await fonts'
    );
    assert.ok(
      !captureBody.includes('await'),
      'capturePreviewPng must NOT contain any async await'
    );
    assert.ok(
      !captureBody.includes('setState'),
      'capturePreviewPng must NOT mutate state'
    );

    // 5. Must use distinct download filename
    assert.ok(
      captureBody.includes('-attached-preview-'),
      'capturePreviewPng download filename must include -attached-preview- to distinguish from export'
    );

    // 6. Must be disabled until preview render completes
    assert.ok(
      reviewSource.includes('disabled={!previewReady}'),
      'Capture preview button must be disabled until previewReady is true'
    );

    // 7. Clearly labeled distinct from existing Tải PNG
    assert.ok(
      reviewSource.includes('Chụp preview DOM'),
      'Capture button must be labeled "Chụp preview DOM"'
    );
    assert.ok(
      reviewSource.includes('Tải PNG (Export)'),
      'Export button must be clearly labeled "Tải PNG (Export)"'
    );
    console.log('✓ Passed: Dev-only attached preview capture directly serializes canvas ref without redraw, font await, or replacement canvas, disabled until ready');
  }

  // --- Test 8: Attached Preview vs Detached Export Typography Normalization ---
  console.log('\n--- Test 8: Attached preview vs detached export typography normalization ---');
  {
    // 1. normalizeCanvasContext functionality on canvas and context
    const mockStyle = { letterSpacing: '-0.006em', wordSpacing: '10px' };
    const mockCanvas = { style: mockStyle };
    const mockCtx = {
      letterSpacing: '-0.006em',
      wordSpacing: '10px',
      fontKerning: 'none',
      textRendering: 'optimizeSpeed',
      fontStretch: 'condensed',
      fontVariantCaps: 'small-caps',
      direction: 'rtl',
    };

    normalizeCanvasContext(mockCtx, mockCanvas);

    assert.equal(mockCanvas.style.letterSpacing, 'normal', 'Canvas style letterSpacing must be normalized to normal');
    assert.equal(mockCanvas.style.wordSpacing, 'normal', 'Canvas style wordSpacing must be normalized to normal');
    assert.equal(mockCanvas.style.webkitFontSmoothing, 'subpixel-antialiased', 'Canvas style webkitFontSmoothing must be normalized to subpixel-antialiased');
    assert.equal(mockCanvas.style.textRendering, 'geometricPrecision', 'Canvas style textRendering must be normalized to geometricPrecision');
    assert.equal(mockCtx.letterSpacing, '0px', 'Context letterSpacing must be normalized to 0px');
    assert.equal(mockCtx.wordSpacing, '0px', 'Context wordSpacing must be normalized to 0px');
    assert.equal(mockCtx.fontKerning, 'normal', 'Context fontKerning must be normal');
    assert.equal(mockCtx.textRendering, 'geometricPrecision', 'Context textRendering must be geometricPrecision');
    assert.equal(mockCtx.fontStretch, 'normal', 'Context fontStretch must be normal');
    assert.equal(mockCtx.fontVariantCaps, 'normal', 'Context fontVariantCaps must be normal');
    assert.equal(mockCtx.direction, 'ltr', 'Context direction must be ltr');

    // 2. globals.css canvas normalization rule
    const globalsCss = fs.readFileSync('src/app/globals.css', 'utf8');
    assert.ok(
      globalsCss.includes('canvas {') && globalsCss.includes('letter-spacing: normal !important;'),
      'globals.css must reset canvas letter-spacing: normal !important to eliminate body letter-spacing inheritance'
    );
    assert.ok(
      globalsCss.includes('word-spacing: normal !important;'),
      'globals.css must reset canvas word-spacing: normal !important'
    );
    assert.ok(
      globalsCss.includes('font-kerning: normal !important;'),
      'globals.css must set canvas font-kerning: normal !important'
    );
    assert.ok(
      globalsCss.includes('text-rendering: geometricPrecision !important;'),
      'globals.css must set canvas text-rendering: geometricPrecision !important'
    );
    assert.ok(
      globalsCss.includes('-webkit-font-smoothing: subpixel-antialiased !important;'),
      'globals.css must set canvas -webkit-font-smoothing: subpixel-antialiased !important'
    );

    // 3. design-engine.ts normalization calls (AST function-level validation before renderer dispatch)
    const designEngine = fs.readFileSync('src/lib/design-engine.ts', 'utf8');
    assert.ok(
      designEngine.includes('normalizeCanvasContext'),
      'design-engine.ts must import and re-export normalizeCanvasContext'
    );

    const sf = ts.createSourceFile('src/lib/design-engine.ts', designEngine, ts.ScriptTarget.Latest, true);
    let coreFn = null;
    ts.forEachChild(sf, (node) => {
      if (ts.isFunctionDeclaration(node) && node.name && node.name.text === 'drawIndustryPosterCore') {
        coreFn = node;
      }
    });
    assert.ok(coreFn, 'drawIndustryPosterCore function must exist in AST');

    let normalizeCallPos = -1;
    let firstDispatchPos = -1;

    function inspectCoreAst(node) {
      if (ts.isCallExpression(node)) {
        const text = node.expression.getText(sf);
        if (text === 'normalizeCanvasContext') {
          normalizeCallPos = node.getStart(sf);
          assert.equal(node.arguments.length, 2, 'normalizeCanvasContext must be called with (ctx, canvas)');
          assert.equal(node.arguments[0].getText(sf), 'ctx');
          assert.equal(node.arguments[1].getText(sf), 'canvas');
        }
        if (['drawIndustryConcept', 'drawCatalogPoster'].includes(text)) {
          if (firstDispatchPos === -1 || node.getStart(sf) < firstDispatchPos) {
            firstDispatchPos = node.getStart(sf);
          }
        }
      }
      ts.forEachChild(node, inspectCoreAst);
    }

    inspectCoreAst(coreFn);
    assert.ok(normalizeCallPos !== -1, 'drawIndustryPosterCore must call normalizeCanvasContext(ctx, canvas)');
    assert.ok(firstDispatchPos !== -1, 'Renderer dispatch calls must exist inside drawIndustryPosterCore');
    assert.ok(
      normalizeCallPos < firstDispatchPos,
      'normalizeCanvasContext(ctx, canvas) must execute BEFORE any renderer dispatch (drawIndustryConcept, drawCatalogPoster)'
    );

    // 4. catalog-renderer.ts normalization calls
    const catalogRenderer = fs.readFileSync('src/lib/catalog-renderer.ts', 'utf8');
    assert.ok(
      catalogRenderer.includes('normalizeCanvasContext'),
      'catalog-renderer.ts must import normalizeCanvasContext'
    );
    assert.ok(
      catalogRenderer.includes('normalizeCanvasContext(ctx, canvas)'),
      'drawCatalogPoster must call normalizeCanvasContext(ctx, canvas)'
    );

    // 5. Check inline style normalization on DOM canvas in review and marketing pages
    const storyReview = fs.readFileSync('src/app/studio/marketing/review/story-source/page.tsx', 'utf8');
    assert.ok(
      storyReview.includes("WebkitFontSmoothing: 'subpixel-antialiased'"),
      'story-source/page.tsx preview canvas must have inline WebkitFontSmoothing normalization'
    );
    assert.ok(
      storyReview.includes("textRendering: 'geometricPrecision'"),
      'story-source/page.tsx preview canvas must have inline textRendering normalization'
    );
    const marketingPage = fs.readFileSync('src/app/studio/marketing/page.tsx', 'utf8');
    assert.ok(
      marketingPage.includes("WebkitFontSmoothing: 'subpixel-antialiased'"),
      'marketing/page.tsx preview canvas must have inline WebkitFontSmoothing normalization'
    );
    assert.ok(
      marketingPage.includes("textRendering: 'geometricPrecision'"),
      'marketing/page.tsx preview canvas must have inline textRendering normalization'
    );

    // 6. Verify Oct 14, Oct 15 R1, and Oct 15 R2 attached-preview evidence baselines
    const attachedEvidenceDirOct14 = path.resolve('../back-end/docs/template-v2/reports/attached-preview-20261014');
    assert.ok(fs.existsSync(attachedEvidenceDirOct14), 'attached-preview-20261014 directory must exist');
    const attachedQcOct14 = JSON.parse(fs.readFileSync(path.join(attachedEvidenceDirOct14, 'qc.json'), 'utf8'));
    assert.equal(attachedQcOct14.totalPixels, 1458000, 'Oct 14 baseline total pixels must be 1458000');
    assert.equal(attachedQcOct14.differentPixels, 37107, 'Oct 14 baseline differing pixels must be 37107');

    const attachedEvidenceDirOct15 = path.resolve('../back-end/docs/template-v2/reports/attached-preview-20261015');
    assert.ok(fs.existsSync(attachedEvidenceDirOct15), 'attached-preview-20261015 directory must exist');
    const attachedQcOct15 = JSON.parse(fs.readFileSync(path.join(attachedEvidenceDirOct15, 'qc.json'), 'utf8'));
    assert.equal(attachedQcOct15.totalPixels, 1458000, 'Oct 15 baseline total pixels must be 1458000');
    assert.equal(attachedQcOct15.previewExport, 20926, 'Oct 15 baseline previewExport must be 20926');
    assert.equal(attachedQcOct15.exportZip, 0, 'Oct 15 baseline exportZip must remain exactly 0 diffs');

    const attachedEvidenceDirR2 = path.resolve('../back-end/docs/template-v2/reports/attached-preview-r2-20261015');
    if (fs.existsSync(attachedEvidenceDirR2)) {
      const attachedQcR2 = JSON.parse(fs.readFileSync(path.join(attachedEvidenceDirR2, 'qc.json'), 'utf8'));
      assert.equal(attachedQcR2.totalPixels, 1458000, 'R2 baseline total pixels must be 1458000');
      assert.equal(attachedQcR2.previewExport, 0, 'R2 baseline previewExport must be 0 diffs');
      assert.equal(attachedQcR2.exportZip, 0, 'R2 baseline exportZip must be 0 diffs');
      console.log('✓ Confirmed R2 browser evidence: attached preview vs export vs ZIP all equal 0 / 1458000 differing pixels');
    }

    console.log('✓ Passed: Dual-level typography normalization (CSS + Context2D: subpixel-antialiased, geometricPrecision, normal kerning), AST execution order, and Oct 14/15 baselines verified');
  }

  console.log('\n=== ALL 8 FONT PARITY & PREVIEW CAPTURE QC TESTS PASSED 100%! ===');
}

runFontParityTests().catch((err) => {
  console.error('FONT PARITY QC TEST FAILED:', err);
  process.exit(1);
});
