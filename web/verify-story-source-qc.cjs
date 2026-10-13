const fs = require('node:fs');
const ts = require('typescript');
const assert = require('node:assert/strict');

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
  balancedPages,
  pageAt,
  normalizePointList,
  resolveStoryPoints,
  resolveStorySource,
  clampStoryPageInState,
  snapshotStoryState,
  createExportSnapshot,
  VALID_CONCEPT_IDS,
  isValidIndustryConcept,
} = require('./src/lib/balanced-pages.ts');
const { CONCEPTS, EXAMPLES, makeIndustryCopy } = require('./src/lib/industry-concepts.ts');
const { drawIndustryPoster } = require('./src/lib/design-engine.ts');
const { marketingZip } = require('./src/lib/marketing-zip.ts');
const { DraftController } = require('./src/lib/draft-controller.ts');

function createRecordingCanvas(width = 1080, height = 1350) {
  const texts = [];
  const makeGrad = () => ({ addColorStop: () => {} });
  const ctx = new Proxy(
    {
      measureText: (s) => ({ width: String(s || '').length * 10 }),
      fillText: (s) => {
        if (typeof s === 'string' && s.trim()) texts.push(s.trim());
      },
      createLinearGradient: makeGrad,
      createRadialGradient: makeGrad,
      getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    },
    {
      get: (o, k) => (k in o ? o[k] : () => {}),
      set: (o, k, v) => ((o[k] = v), true),
    }
  );
  return {
    width,
    height,
    texts,
    getContext: () => ctx,
  };
}

function parseZipEntries(buffer) {
  const entries = {};
  let pos = 0;
  while (pos + 30 <= buffer.length && buffer.readUInt32LE(pos) === 0x04034b50) {
    const len = buffer.readUInt32LE(pos + 18);
    const nl = buffer.readUInt16LE(pos + 26);
    const el = buffer.readUInt16LE(pos + 28);
    const name = buffer.subarray(pos + 30, pos + 30 + nl).toString('utf8');
    const start = pos + 30 + nl + el;
    entries[name] = buffer.subarray(start, start + len);
    pos = start + len;
  }
  return entries;
}

function buildPageExportHarness(liveState, options = {}) {
  const source = fs.readFileSync('src/app/studio/marketing/page.tsx', 'utf8');
  const block = source.slice(
    source.indexOf('  const prepareExport ='),
    source.indexOf('  // Copy caption')
  );
  const compiled = ts.transpileModule(block, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText;

  const statuses = [];
  const renders = [];
  let archive = null;
  let downloadName = '';
  let clicked = 0;
  let releaseFonts;
  const fontsReady = options.manualFonts
    ? new Promise((r) => {
        releaseFonts = r;
      })
    : Promise.resolve();

  const doc = {
    fonts: { ready: fontsReady },
    createElement: (type) => {
      if (type === 'a') {
        return {
          set href(_v) {},
          set download(v) {
            downloadName = v;
          },
          click: () => {
            clicked++;
          },
        };
      }
      const c = createRecordingCanvas(1080, 1350);
      c.toBlob = (cb) => {
        queueMicrotask(async () => {
          if (options.onBeforeBlob) {
            await options.onBeforeBlob(c.record, renders.length);
          }
          cb(new Blob([JSON.stringify(c.record)]));
        });
      };
      return c;
    },
  };

  const drawWrapper = (canvas, st, kind, copy, asset, bg, logo) => {
    drawIndustryPoster(canvas, st, kind, copy, asset, bg, logo);
    const resolved = resolveStorySource(st, copy);
    canvas.record = {
      kind,
      storyPage: st.storyPage,
      resolvedPageIndex: resolved.pageIndex,
      resolvedPageItems: resolved.pageItems,
      texts: [...canvas.texts],
      headline: copy?.headline || '',
    };
    renders.push(canvas.record);
  };

  const extractFactsFromDetails = (details) =>
    normalizePointList(details).map((text, i) => ({
      id: `fact_${i + 1}`,
      source_excerpt: text,
      text,
      selected: true,
    }));

  const factory = Function(
    'state',
    'document',
    'loadAsset',
    'loadBgImg',
    'drawIndustryPoster',
    'setStatusText',
    'balancedPages',
    'extractFactsFromDetails',
    'marketingZip',
    'URL',
    'setTimeout',
    compiled + ';return { prepareExport, handleDownloadAllSizes, handleDownloadSingle, handleDownloadZip };'
  );

  const handlers = factory(
    liveState,
    doc,
    async (url) => (url ? { url, im: { width: 400, height: 400, naturalWidth: 400, naturalHeight: 400 } } : null),
    async (url) => (url ? { url, width: 600, height: 800, naturalWidth: 600, naturalHeight: 800, complete: true } : null),
    drawWrapper,
    (s) => statuses.push(s),
    balancedPages,
    extractFactsFromDetails,
    marketingZip,
    {
      createObjectURL: (b) => {
        archive = b;
        return 'blob:story-qc';
      },
      revokeObjectURL: () => {},
    },
    () => {}
  );

  return {
    ...handlers,
    statuses,
    renders,
    getArchive: () => archive,
    getDownloadName: () => downloadName,
    getClicked: () => clicked,
    releaseFonts: () => releaseFonts && releaseFonts(),
  };
}

async function runAllTests() {
  console.log('=== RUNNING STORY SOURCE PAGINATION & SNAPSHOT QC ===\n');

  // --- Test 1: Five source lines / no points => two exported pages with exact once-only order ---
  console.log('--- Test 1: Five source lines / no points => two exported pages with exact once-only order ---');
  {
    const sourceLines = [
      'Nội dung một: Kiến trúc hệ thống',
      'Nội dung hai: Tối ưu cơ sở dữ liệu',
      'Nội dung ba: Phát triển sản phẩm lõi',
      'Nội dung bốn: Đào tạo đội ngũ kế cận',
      'Nội dung năm: Đãi ngộ cạnh tranh',
    ];
    const emptyCopy = {
      headline: 'Kiểm tra đủ nội dung',
      subline: 'Thông điệp phụ',
      cta: 'Liên hệ',
      caption: 'Caption kiểm tra',
      points: [],
    };
    const state = {
      industry: 'recruitment',
      categoryId: 'recruitment',
      templateId: 'agenda',
      brand: 'MIVY QC',
      name: 'Senior Architect',
      offer: 'Lương 40 triệu',
      aspect: '4:5',
      theme: 'emerald_pro',
      selected: 'story',
      details: sourceLines.join('\n'),
      facts: [],
      storyPage: 0,
      storyPerPage: 3,
      copies: {
        launch: { ...emptyCopy },
        story: { ...emptyCopy },
        action: { ...emptyCopy },
      },
    };

    const resolved0 = resolveStorySource(state, state.copies.story);
    assert.equal(resolved0.isConcept, false);
    assert.equal(resolved0.totalPages, 2);
    assert.deepEqual(resolved0.pages, [sourceLines.slice(0, 3), sourceLines.slice(3, 5)]);
    assert.deepEqual(resolved0.pageItems, sourceLines.slice(0, 3));

    const resolved1 = resolveStorySource({ ...state, storyPage: 1 }, state.copies.story);
    assert.equal(resolved1.pageIndex, 1);
    assert.deepEqual(resolved1.pageItems, sourceLines.slice(3, 5));

    // Verify ZIP export produces 2 story pages in exact once-only order
    const harness = buildPageExportHarness(state);
    await harness.handleDownloadZip();
    assert.equal(harness.getClicked(), 1);

    const storyRenders = harness.renders.filter((r) => r.kind === 'story');
    assert.equal(storyRenders.length, 2, 'Expected exactly 2 rendered story pages');
    assert.deepEqual(storyRenders[0].resolvedPageItems, sourceLines.slice(0, 3));
    assert.deepEqual(storyRenders[1].resolvedPageItems, sourceLines.slice(3, 5));
    assert.deepEqual(
      storyRenders.flatMap((r) => r.resolvedPageItems),
      sourceLines,
      'Exported story pages must preserve exact once-only order of 5 source lines'
    );

    // Check rendered canvas text on page 1 vs page 2
    for (const line of sourceLines.slice(0, 3)) {
      assert.ok(storyRenders[0].texts.some((t) => line.includes(t) || t.includes(line.split(':')[0])));
      assert.ok(!storyRenders[1].texts.some((t) => t.includes(line.split(':')[0])));
    }
    for (const line of sourceLines.slice(3, 5)) {
      assert.ok(storyRenders[1].texts.some((t) => line.includes(t) || t.includes(line.split(':')[0])));
      assert.ok(!storyRenders[0].texts.some((t) => t.includes(line.split(':')[0])));
    }

    const zipEntries = parseZipEntries(Buffer.from(await harness.getArchive().arrayBuffer()));
    assert.ok(zipEntries['02-story-page1-poster.png'], 'Missing 02-story-page1-poster.png');
    assert.ok(zipEntries['02-story-page2-poster.png'], 'Missing 02-story-page2-poster.png');
    assert.equal(zipEntries['02-story-page3-poster.png'], undefined);
    const manifest = JSON.parse(zipEntries['manifest.json'].toString('utf8'));
    assert.equal(manifest.story_carousel_pages, 2);
    console.log('✓ Passed: 5 source lines / empty points -> 2 exported pages with exact once-only order');
  }

  // --- Test 2: Selected facts outrank raw details ---
  console.log('\n--- Test 2: Selected facts outrank raw details ---');
  {
    const copy = { headline: 'Tiêu chí', subline: '', cta: 'Ứng tuyển', caption: '', points: [] };
    const state = {
      industry: 'recruitment',
      categoryId: 'recruitment',
      templateId: 'editorial',
      brand: 'MIVY',
      aspect: '4:5',
      theme: 'emerald_pro',
      selected: 'story',
      details: 'Raw line 1\nRaw line 2\nRaw line 3\nRaw line 4\nRaw line 5',
      facts: [
        { id: 'f1', source_excerpt: 'Raw 1', text: 'Fact đã chọn số 1', selected: true },
        { id: 'f2', source_excerpt: 'Raw 2', text: 'Fact bị bỏ chọn số 2', selected: false },
        { id: 'f3', source_excerpt: 'Raw 3', text: 'Fact đã chọn số 3', selected: true },
        { id: 'f4', source_excerpt: 'Raw 4', text: 'Fact đã chọn số 4', selected: true },
        { id: 'f5', source_excerpt: 'Raw 5', text: 'Fact đã chọn số 5', selected: true },
      ],
      storyPage: 0,
      storyPerPage: 3,
      copies: { launch: { ...copy }, story: { ...copy }, action: { ...copy } },
    };

    const resolved = resolveStorySource(state, state.copies.story);
    assert.deepEqual(resolved.items, [
      'Fact đã chọn số 1',
      'Fact đã chọn số 3',
      'Fact đã chọn số 4',
      'Fact đã chọn số 5',
    ]);
    assert.equal(resolved.totalPages, 2);
    assert.deepEqual(resolved.pages[0], ['Fact đã chọn số 1', 'Fact đã chọn số 3', 'Fact đã chọn số 4']);
    assert.deepEqual(resolved.pages[1], ['Fact đã chọn số 5']);
    console.log('✓ Passed: Selected facts outrank raw details and exclude unselected facts');
  }

  // --- Test 3: Explicit points outrank facts and details ---
  console.log('\n--- Test 3: Explicit points outrank selected facts and raw details ---');
  {
    const explicit = ['Điểm chỉnh tay A', 'Điểm chỉnh tay B', 'Điểm chỉnh tay C', 'Điểm chỉnh tay D'];
    const copy = { headline: 'Tiêu chí', subline: '', cta: 'Ứng tuyển', caption: '', points: explicit };
    const state = {
      industry: 'recruitment',
      categoryId: 'recruitment',
      templateId: 'agenda',
      brand: 'MIVY',
      aspect: '4:5',
      theme: 'emerald_pro',
      selected: 'story',
      details: 'Raw line 1\nRaw line 2\nRaw line 3\nRaw line 4\nRaw line 5',
      facts: [
        { id: 'f1', source_excerpt: 'Raw 1', text: 'Fact 1', selected: true },
        { id: 'f2', source_excerpt: 'Raw 2', text: 'Fact 2', selected: true },
      ],
      storyPage: 0,
      storyPerPage: 3,
      copies: { launch: { ...copy }, story: { ...copy }, action: { ...copy } },
    };

    const resolved = resolveStorySource(state, state.copies.story);
    assert.deepEqual(resolved.items, explicit);
    assert.equal(resolved.totalPages, 2);
    assert.deepEqual(resolved.pages, [explicit.slice(0, 3), explicit.slice(3, 4)]);
    console.log('✓ Passed: Explicit copy.points outrank both selected facts and raw details');
  }

  // --- Test 4: Intentional clear (pointsEdited=true, points=[]) stays empty without refill or manufactured facts ---
  console.log('\n--- Test 4: Intentional clear stays empty across resolver, renderers, and export ---');
  {
    const clearedCopy = {
      headline: 'Đã xóa trắng tiêu chí',
      subline: 'Subline không được tự chèn vào body',
      cta: 'Liên hệ',
      caption: '',
      points: [],
      pointsEdited: true,
    };
    const baseState = {
      industry: 'recruitment',
      categoryId: 'recruitment',
      brand: 'MIVY',
      name: 'Backend Lead',
      offer: '3000 USD',
      aspect: '4:5',
      theme: 'emerald_pro',
      selected: 'story',
      details: 'Dòng chi tiết 1\nDòng chi tiết 2\nDòng chi tiết 3\nDòng chi tiết 4\nDòng chi tiết 5',
      facts: [
        { id: 'f1', source_excerpt: '1', text: 'Fact 1 không được refill', selected: true },
        { id: 'f2', source_excerpt: '2', text: 'Fact 2 không được refill', selected: true },
      ],
      storyPage: 0,
      storyPerPage: 3,
      copies: {
        launch: { ...clearedCopy },
        story: { ...clearedCopy },
        action: { ...clearedCopy },
      },
    };

    const resolved = resolveStorySource(baseState, baseState.copies.story);
    assert.deepEqual(resolved.items, []);
    assert.deepEqual(resolved.pages, [[]]);
    assert.equal(resolved.totalPages, 1);
    assert.equal(resolved.pageIndex, 0);
    assert.deepEqual(resolved.pageItems, []);

    // Verify across all story renderer branches: catalog, concept, recruitment matrix, recruitment full_photo, general full_photo
    const variants = [
      { ...baseState, templateId: 'agenda' },
      { ...baseState, conceptId: 'recruitment-announcement', industryFields: EXAMPLES.recruitment },
      { ...baseState, layoutMode: 'matrix', templateId: undefined },
      { ...baseState, layoutMode: 'full_photo', templateId: undefined },
      { ...baseState, industry: 'general', categoryId: 'retail', layoutMode: 'full_photo', templateId: undefined },
    ];

    for (const variant of variants) {
      const c = createRecordingCanvas(1080, 1350);
      drawIndustryPoster(c, variant, 'story', variant.copies.story, null, null);
      const joined = c.texts.join(' | ');
      assert.ok(!joined.includes('Dòng chi tiết 1'), 'Must not refill from details');
      assert.ok(!joined.includes('Fact 1 không được refill'), 'Must not refill from selected facts');
      assert.ok(!joined.includes('Hands-on production software experience'), 'Must not manufacture English fact');
      assert.ok(!joined.includes('Kinh nghiệm làm việc thực tế với các dự án production'), 'Must not manufacture Vietnamese fact');
    }

    const harness = buildPageExportHarness({ ...baseState, templateId: 'agenda' });
    await harness.handleDownloadZip();
    const storyRenders = harness.renders.filter((r) => r.kind === 'story');
    assert.equal(storyRenders.length, 1);
    assert.deepEqual(storyRenders[0].resolvedPageItems, []);
    const zipEntries = parseZipEntries(Buffer.from(await harness.getArchive().arrayBuffer()));
    assert.ok(zipEntries['02-story-poster.png'], 'Single empty story page must export as 02-story-poster.png');
    assert.equal(JSON.parse(zipEntries['manifest.json'].toString('utf8')).story_carousel_pages, 1);
    console.log('✓ Passed: Intentional clear stays empty (1 empty page, no refill, no manufactured facts)');
  }

  // --- Test 5: 10 concept items remain balanced 3/3/2/2 ---
  console.log('\n--- Test 5: 10 concept items remain balanced 3/3/2/2 ---');
  {
    const tenItems = Array.from({ length: 10 }, (_, i) => `Tiêu chí concept số ${i + 1}`);
    const copy = {
      headline: 'Tuyển dụng Concept',
      subline: 'Lên đến 3,000 USD',
      cta: 'Ứng tuyển',
      caption: 'Caption',
      points: tenItems,
      pointsEdited: false,
    };
    const state = {
      industry: 'recruitment',
      categoryId: 'recruitment',
      conceptId: 'recruitment-announcement',
      industryFields: EXAMPLES.recruitment,
      brand: 'MIVY',
      name: 'Engineer',
      offer: '',
      details: 'Extra raw details that should not alter concept points',
      facts: [],
      aspect: '4:5',
      theme: 'emerald_pro',
      selected: 'story',
      storyPage: 0,
      storyPerPage: 3,
      copies: { launch: { ...copy }, story: { ...copy }, action: { ...copy } },
    };

    const resolved = resolveStorySource(state, state.copies.story);
    assert.equal(resolved.isConcept, true);
    assert.equal(resolved.totalPages, 4);
    assert.deepEqual(
      resolved.pages.map((p) => p.length),
      [3, 3, 2, 2]
    );
    assert.deepEqual(resolved.pages.flat(), tenItems);

    const harness = buildPageExportHarness(state);
    await harness.handleDownloadZip();
    const storyRenders = harness.renders.filter((r) => r.kind === 'story');
    assert.equal(storyRenders.length, 4);
    assert.deepEqual(
      storyRenders.map((r) => r.resolvedPageItems.length),
      [3, 3, 2, 2]
    );
    assert.deepEqual(
      storyRenders.flatMap((r) => r.resolvedPageItems),
      tenItems
    );
    console.log('✓ Passed: 10 concept items remain balanced as 3/3/2/2');
  }

  // --- Test 6: Mid-export mutation cannot alter archive & original draft is not altered ---
  console.log('\n--- Test 6: Mid-export mutation cannot alter archive & original draft is preserved ---');
  {
    const initialLines = ['Dòng gốc 1', 'Dòng gốc 2', 'Dòng gốc 3', 'Dòng gốc 4', 'Dòng gốc 5'];
    const copy = {
      headline: 'Tiêu đề gốc',
      subline: '',
      cta: 'Liên hệ',
      caption: 'Caption gốc',
      points: [],
    };
    const liveState = {
      industry: 'recruitment',
      categoryId: 'recruitment',
      templateId: 'agenda',
      brand: 'MIVY ORIGINAL',
      name: 'Vị trí gốc',
      offer: 'Đãi ngộ gốc',
      aspect: '4:5',
      theme: 'emerald_pro',
      selected: 'story',
      details: initialLines.join('\n'),
      facts: [],
      storyPage: 0,
      storyPerPage: 3,
      copies: {
        launch: { ...copy },
        story: { ...copy, points: [] },
        action: { ...copy },
      },
    };

    const beforeExportClone = structuredClone(liveState);

    const harness = buildPageExportHarness(liveState, {
      manualFonts: true,
      onBeforeBlob: (record) => {
        if (record.kind === 'story' && record.storyPage === 0) {
          // Mutate live state between page 1 and page 2 async blob encoding
          liveState.details = 'Dòng bị sửa giữa chừng A\nDòng bị sửa giữa chừng B';
          liveState.copies.story.points = ['Điểm chèn ngang khi đang xuất'];
          liveState.copies.story.pointsEdited = true;
        }
      },
    });

    const pendingZip = harness.handleDownloadZip();

    // Verify prepareExport did not mutate liveState before external mutation
    assert.deepEqual(
      liveState,
      beforeExportClone,
      'prepareExport must not mutate the original live draft state'
    );

    // Mutate live state while awaiting document.fonts.ready
    liveState.details = 'Mutated while awaiting fonts';
    liveState.copies.story.headline = 'Mutated headline';
    liveState.copies.story.points.push('Mutated point while awaiting fonts');
    liveState.facts = [{ id: 'f99', source_excerpt: 'm', text: 'Mutated fact', selected: true }];
    liveState.storyPage = 99;

    harness.releaseFonts();
    await pendingZip;

    const storyRenders = harness.renders.filter((r) => r.kind === 'story');
    assert.equal(storyRenders.length, 2);
    assert.deepEqual(storyRenders[0].resolvedPageItems, initialLines.slice(0, 3));
    assert.deepEqual(storyRenders[1].resolvedPageItems, initialLines.slice(3, 5));
    assert.ok(storyRenders.every((r) => r.headline === 'Tiêu đề gốc'));

    const zipEntries = parseZipEntries(Buffer.from(await harness.getArchive().arrayBuffer()));
    assert.equal(JSON.parse(zipEntries['manifest.json'].toString('utf8')).story_carousel_pages, 2);
    assert.ok(zipEntries['source.txt'].toString('utf8').includes('Dòng gốc 1'));
    assert.ok(!zipEntries['source.txt'].toString('utf8').includes('Mutated'));
    console.log('✓ Passed: Mid-export mutation cannot alter archive; original draft untouched');
  }

  // --- Test 7: Source shrink clamps selected page ---
  console.log('\n--- Test 7: Source shrink clamps selected page ---');
  {
    const copy = { headline: 'Clamping Test', subline: '', cta: 'OK', caption: '', points: [] };
    const state5 = {
      industry: 'recruitment',
      categoryId: 'recruitment',
      templateId: 'agenda',
      brand: 'MIVY',
      name: 'Dev',
      offer: '',
      aspect: '4:5',
      theme: 'emerald_pro',
      selected: 'story',
      details: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5',
      facts: [],
      storyPage: 1, // Page 2 of 2 (0-indexed)
      storyPerPage: 3,
      copies: { launch: { ...copy }, story: { ...copy }, action: { ...copy } },
    };

    assert.equal(resolveStorySource(state5).pageIndex, 1);

    // Shrink details from 5 lines to 2 lines (now only 1 page exists)
    const shrunkState = {
      ...state5,
      details: 'Line 1\nLine 2',
      storyPage: 1, // Stale page index 1
    };

    const resolvedShrunk = resolveStorySource(shrunkState);
    assert.equal(resolvedShrunk.totalPages, 1);
    assert.equal(resolvedShrunk.pageIndex, 0, 'Resolver must clamp pageIndex from 1 to 0');
    assert.deepEqual(resolvedShrunk.pageItems, ['Line 1', 'Line 2']);

    // Verify DraftController.saveState clamps storyPage on state
    let latestControllerState = null;
    const controller = new DraftController({
      storage: null,
      initialState: state5,
      onStateChange: (next) => {
        latestControllerState = next;
      },
    });
    controller.saveState(shrunkState);
    assert.equal(latestControllerState.storyPage, 0, 'DraftController.saveState must clamp storyPage to 0');
    controller.dispose();

    // Verify single PNG export and 3-sizes export clamp stale storyPage
    const singleHarness = buildPageExportHarness(shrunkState);
    await singleHarness.handleDownloadSingle();
    assert.equal(singleHarness.renders.length, 1);
    assert.equal(singleHarness.renders[0].storyPage, 0);
    assert.deepEqual(singleHarness.renders[0].resolvedPageItems, ['Line 1', 'Line 2']);

    const sizesHarness = buildPageExportHarness(shrunkState);
    await sizesHarness.handleDownloadAllSizes();
    assert.equal(sizesHarness.renders.length, 3);
    assert.ok(sizesHarness.renders.every((r) => r.storyPage === 0));
    console.log('✓ Passed: Source shrink clamps selected page across resolver, controller, renderer, and exports');
  }

  // --- Test 8: VI/EN and newline handling ---
  console.log('\n--- Test 8: VI/EN and newline handling ---');
  {
    const messyDetails = '  First requirement with CRLF  \r\n\r\n   \n  Second requirement with CR \r  Third requirement  \n fourth requirement \r\n';
    const normalized = normalizePointList(messyDetails);
    assert.deepEqual(normalized, [
      'First requirement with CRLF',
      'Second requirement with CR',
      'Third requirement',
      'fourth requirement',
    ]);

    // Check makeIndustryCopy with CRLF and blank lines
    const conceptCopy = makeIndustryCopy('recruitment', {
      role: 'Engineer',
      requirements: 'Req 1\r\n\r\n  Req 2  \rReq 3',
      benefits: '\nBen 1\r\n  ',
    });
    assert.deepEqual(conceptCopy.points, ['Req 1', 'Req 2', 'Req 3', 'Ben 1']);

    // Check English vs Vietnamese label resolution in story renderers when points come from details fallback
    const emptyCopy = { headline: '', subline: '', cta: '', caption: '', points: [] };
    const enState = {
      industry: 'recruitment',
      categoryId: 'recruitment',
      layoutMode: 'matrix',
      brand: 'GLOBAL TECH',
      name: 'Senior Backend Engineer',
      offer: 'Up to $4000',
      aspect: '4:5',
      theme: 'emerald_pro',
      selected: 'story',
      outputLanguage: 'preserve',
      details: '5+ years experience with distributed systems\r\nStrong skills in backend architecture\r\nBuild reliable services for production\r\nMentor senior developer team',
      facts: [],
      storyPage: 0,
      storyPerPage: 3,
      copies: { launch: { ...emptyCopy }, story: { ...emptyCopy }, action: { ...emptyCopy } },
    };

    const canvasEn = createRecordingCanvas(1080, 1350);
    drawIndustryPoster(canvasEn, enState, 'story', enState.copies.story, null, null);
    assert.ok(
      canvasEn.texts.some((t) => t.includes('PAGE 1/2') && t.includes('REQUIREMENTS')),
      'English preserve state with 4 detail lines must render PAGE 1/2 · REQUIREMENTS'
    );

    const viState = {
      ...enState,
      outputLanguage: 'vi',
      details: '5+ năm kinh nghiệm hệ thống phân tán\r\nThành thạo kiến trúc backend\r\nXây dựng dịch vụ chịu tải cao\r\nHướng dẫn đội ngũ kỹ sư',
    };
    const canvasVi = createRecordingCanvas(1080, 1350);
    drawIndustryPoster(canvasVi, viState, 'story', viState.copies.story, null, null);
    assert.ok(
      canvasVi.texts.some((t) => t.includes('TRANG 1/2') && t.includes('TIÊU CHÍ & YÊU CẦU')),
      'Vietnamese state with 4 detail lines must render TRANG 1/2 · TIÊU CHÍ & YÊU CẦU'
    );
    console.log('✓ Passed: CRLF/CR/blank-line normalization and VI/EN story pagination labels verified');
  }

  // --- Test 9: Fixture and Catalog Concept Consistency ---
  console.log('\n--- Test 9: Fixture and catalog concept consistency ---');
  {
    // 1. Verify 1-to-1 parity between production CONCEPTS catalog and VALID_CONCEPT_IDS
    const catalogIds = CONCEPTS.map((c) => c.id).sort();
    const validIds = [...VALID_CONCEPT_IDS].sort();
    assert.deepEqual(catalogIds, validIds, 'CONCEPTS catalog IDs must match VALID_CONCEPT_IDS exactly');

    // 2. Verify all catalog concepts satisfy isValidIndustryConcept with their category
    for (const concept of CONCEPTS) {
      assert.equal(
        isValidIndustryConcept({ categoryId: concept.category, conceptId: concept.id }),
        true,
        `Concept ${concept.id} with category ${concept.category} must be recognized as valid industry concept`
      );
    }

    // 3. Verify nonexistent, invalid, or mismatched concepts are strictly rejected
    const invalidCandidates = [
      { categoryId: 'recruitment', conceptId: 'recruitment-editorial' },
      { categoryId: 'property', conceptId: 'property-luxury' },
      { categoryId: 'property', conceptId: 'property-blueprint' },
      { categoryId: 'food', conceptId: 'food-unknown' },
      { categoryId: 'recruitment', conceptId: 'food-hero' }, // category mismatch
      { categoryId: 'property', conceptId: 'recruitment-announcement' }, // category mismatch
      { categoryId: 'recruitment', conceptId: '' },
      { categoryId: 'recruitment', conceptId: undefined },
    ];
    for (const cand of invalidCandidates) {
      assert.equal(
        isValidIndustryConcept(cand),
        false,
        `Invalid concept candidate ${cand.conceptId} (cat: ${cand.categoryId}) must be rejected by isValidIndustryConcept`
      );
    }

    // 4. Verify review/story-source/page.tsx fixture references real catalog concept IDs
    const fixturePath = './src/app/studio/marketing/review/story-source/page.tsx';
    assert.ok(fs.existsSync(fixturePath), 'story-source review fixture must exist');
    const fixtureSource = fs.readFileSync(fixturePath, 'utf8');

    // Check that nonexistent concepts are NOT present in the fixture source code
    assert.ok(
      !fixtureSource.includes('recruitment-editorial'),
      'Fixture must not reference nonexistent recruitment-editorial'
    );
    assert.ok(
      !fixtureSource.includes('property-luxury'),
      'Fixture must not reference nonexistent property-luxury'
    );
    assert.ok(
      !fixtureSource.includes('property-blueprint'),
      'Fixture must not reference nonexistent property-blueprint'
    );

    // Find all non-empty conceptId assignments in fixture
    const conceptIdMatches = [...fixtureSource.matchAll(/conceptId:\s*['"]([^'"]+)['"]/g)]
      .map((m) => m[1])
      .filter(Boolean);
    assert.ok(conceptIdMatches.length > 0, 'Fixture must contain at least one non-empty conceptId assignment');
    for (const cId of conceptIdMatches) {
      assert.ok(
        validIds.includes(cId),
        `Fixture conceptId "${cId}" must exist in production catalog CONCEPTS / VALID_CONCEPT_IDS`
      );
    }

    // 5. Verify the actual balanced 10 scenario state from fixture resolves to balancedPages (3/3/2/2), NOT slicePages (3/3/3/1)
    const fields = {
      role: 'Senior Product Engineer',
      salary: '45 - 65 triệu',
      location: 'Quận 1, TP.HCM',
      requirements: [
        '1. Thiết kế kiến trúc frontend hiện đại',
        '2. Tối ưu hiệu năng render canvas 60fps',
        '3. Xây dựng hệ thống kiểm thử tự động',
        '4. Phối hợp chặt chẽ cùng đội ngũ Product',
        '5. Review code và hướng dẫn thành viên mới',
      ].join('\n'),
      benefits: [
        '6. Thưởng hiệu suất 2 lần mỗi năm',
        '7. Bảo hiểm sức khỏe toàn diện cho gia đình',
        '8. Ngân sách học tập & hội thảo 20 triệu/năm',
        '9. Chế độ làm việc hybrid linh hoạt',
        '10. Trang bị MacBook Pro M3 Max',
      ].join('\n'),
      contact: 'careers@mivy.vn · 0909 123 456',
    };
    const fixtureCopy = makeIndustryCopy('recruitment', fields);
    assert.equal(fixtureCopy.points.length, 10);

    const fixtureState = {
      industry: 'recruitment',
      categoryId: 'recruitment',
      conceptId: 'recruitment-announcement',
      industryFields: fields,
      brand: 'MIVY · QC BALANCED 10',
      name: fixtureCopy.headline,
      details: fixtureCopy.caption,
      goal: '',
      offer: '',
      aspect: '4:5',
      theme: 'emerald_pro',
      selected: 'story',
      outputLanguage: 'vi',
      storyPage: 0,
      storyPerPage: 3,
      copies: {
        launch: { ...fixtureCopy },
        story: { ...fixtureCopy },
        action: { ...fixtureCopy },
      },
    };

    const fixtureResolved = resolveStorySource(fixtureState, fixtureState.copies.story);
    assert.equal(fixtureResolved.isConcept, true, 'Fixture state must be recognized as valid industry concept');
    assert.equal(fixtureResolved.totalPages, 4, '10 items at perPage=3 must yield 4 pages');
    assert.deepEqual(
      fixtureResolved.pages.map((p) => p.length),
      [3, 3, 2, 2],
      '10 items must be balanced as [3, 3, 2, 2], NOT [3, 3, 3, 1]'
    );
    console.log('✓ Passed: Fixture and catalog concept consistency verified (prevents masking mismatch)');
  }

  // --- Test 10: Production drawIndustryPoster Content Verification (Agenda & Generic Fallback) ---
  console.log('\n--- Test 10: Production drawIndustryPoster story content verification ---');
  {
    const legacyDetails = [
      '01. Đón khách & check-in sáng',
      '02. Keynote: AI Agents trong vận hành thực tế',
      '03. Panel: Kiến trúc dữ liệu thời gian thực',
      '04. Workshop: Đánh giá chất lượng hệ thống',
      '05. Networking & tổng kết chương trình',
    ];

    const copy = {
      headline: 'AI Summit 2026',
      subline: 'Chi tiết chương trình & diễn giả',
      cta: 'Đăng ký ngay',
      caption: 'AI Summit 2026 - Chương trình hội thảo chuyên sâu.',
      points: [],
      pointsEdited: false,
    };

    // 1. Verify Legacy Agenda production path renders actual story items per page
    const agendaState = {
      industry: 'general',
      categoryId: 'event',
      templateId: 'agenda',
      conceptId: '',
      brand: 'MIVY · QC STORY SOURCE',
      name: 'AI Summit 2026',
      details: legacyDetails.join('\n'),
      goal: 'Thu hút đăng ký tham dự',
      offer: 'Vé Early Bird giảm 30%',
      aspect: '4:5',
      theme: 'emerald_pro',
      selected: 'story',
      outputLanguage: 'vi',
      storyPage: 0,
      storyPerPage: 3,
      copies: { launch: { ...copy }, story: { ...copy }, action: { ...copy } },
    };

    const canvasAgendaP1 = createRecordingCanvas(1080, 1350);
    drawIndustryPoster(canvasAgendaP1, agendaState, 'story', agendaState.copies.story, null, null);
    const textAgendaP1 = canvasAgendaP1.texts.join(' | ');
    assert.ok(textAgendaP1.includes('01. Đón khách'), 'Agenda Page 1 must render item 1');
    assert.ok(textAgendaP1.includes('02. Keynote'), 'Agenda Page 1 must render item 2');
    assert.ok(textAgendaP1.includes('03. Panel'), 'Agenda Page 1 must render item 3');
    assert.ok(!textAgendaP1.includes('04. Workshop'), 'Agenda Page 1 must NOT render item 4');
    assert.ok(!textAgendaP1.includes('05. Networking'), 'Agenda Page 1 must NOT render item 5');
    assert.ok(!textAgendaP1.includes('FEATURED CAMPAIGN'), 'Agenda must NOT render FEATURED CAMPAIGN');

    const canvasAgendaP2 = createRecordingCanvas(1080, 1350);
    drawIndustryPoster(canvasAgendaP2, { ...agendaState, storyPage: 1 }, 'story', agendaState.copies.story, null, null);
    const textAgendaP2 = canvasAgendaP2.texts.join(' | ');
    assert.ok(textAgendaP2.includes('04. Workshop'), 'Agenda Page 2 must render item 4');
    assert.ok(textAgendaP2.includes('05. Networking'), 'Agenda Page 2 must render item 5');
    assert.ok(!textAgendaP2.includes('01. Đón khách'), 'Agenda Page 2 must NOT render item 1');
    assert.ok(!textAgendaP2.includes('02. Keynote'), 'Agenda Page 2 must NOT render item 2');
    assert.ok(!textAgendaP2.includes('FEATURED CAMPAIGN'), 'Agenda must NOT render FEATURED CAMPAIGN');

    // 2. Verify Generic Modern Poster path (no templateId, no conceptId, no photo) renders story items instead of hero
    const genericState = {
      ...agendaState,
      templateId: undefined,
    };

    const canvasGenericP1 = createRecordingCanvas(1080, 1350);
    drawIndustryPoster(canvasGenericP1, genericState, 'story', genericState.copies.story, null, null);
    const textGenericP1 = canvasGenericP1.texts.join(' | ');
    assert.ok(!textGenericP1.includes('FEATURED CAMPAIGN'), 'Generic Story path must not render FEATURED CAMPAIGN');
    assert.ok(!textGenericP1.includes('Sản phẩm nổi bật'), 'Generic Story path must not render empty product placeholder');
    assert.ok(textGenericP1.includes('01. Đón khách'), 'Generic Page 1 must render item 1');
    assert.ok(textGenericP1.includes('02. Keynote'), 'Generic Page 1 must render item 2');
    assert.ok(textGenericP1.includes('03. Panel'), 'Generic Page 1 must render item 3');
    assert.ok(!textGenericP1.includes('04. Workshop'), 'Generic Page 1 must NOT render item 4');

    const canvasGenericP2 = createRecordingCanvas(1080, 1350);
    drawIndustryPoster(canvasGenericP2, { ...genericState, storyPage: 1 }, 'story', genericState.copies.story, null, null);
    const textGenericP2 = canvasGenericP2.texts.join(' | ');
    assert.ok(textGenericP2.includes('04. Workshop'), 'Generic Page 2 must render item 4');
    assert.ok(textGenericP2.includes('05. Networking'), 'Generic Page 2 must render item 5');
    assert.ok(!textGenericP2.includes('01. Đón khách'), 'Generic Page 2 must NOT render item 1');

    console.log('✓ Passed: Production drawIndustryPoster renders actual story items on both Agenda and Generic paths');
  }

  console.log('\n=== ALL 10 STORY SOURCE PAGINATION & SNAPSHOT QC TESTS PASSED 100%! ===');
}

runAllTests().catch((err) => {
  console.error('QC TEST FAILED:', err);
  process.exit(1);
});
