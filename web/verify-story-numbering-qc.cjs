const fs = require('node:fs');
const path = require('node:path');
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
  stripLeadingEnumeration,
  resolveStorySource,
  balancedPages,
} = require('./src/lib/balanced-pages.ts');
const { makeIndustryCopy } = require('./src/lib/industry-concepts.ts');
const { drawIndustryPoster } = require('./src/lib/design-engine.ts');

function createRecordingCanvas(width = 1080, height = 1350) {
  const texts = [];
  const makeGrad = () => ({ addColorStop: () => {} });
  const ctx = new Proxy(
    {
      measureText: (s) => ({ width: String(s || '').length * 10 }),
      fillText: (s) => {
        if (typeof s === 'string' && s.trim()) texts.push(s.trim());
      },
      fillRect: () => {},
      strokeRect: () => {},
      clearRect: () => {},
      beginPath: () => {},
      closePath: () => {},
      arc: () => {},
      roundRect: () => {},
      fill: () => {},
      stroke: () => {},
      save: () => {},
      restore: () => {},
      scale: () => {},
      translate: () => {},
      rotate: () => {},
      clip: () => {},
      drawImage: () => {},
      setTransform: () => {},
      resetTransform: () => {},
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

async function runAllTests() {
  console.log('=== RUNNING STORY NUMBERING & DISPLAY PARITY QC ===\n');

  // --- Test 1: stripLeadingEnumeration unit cases ---
  console.log('--- Test 1: stripLeadingEnumeration unit cases (Numbered formats) ---');
  {
    const numberedCases = [
      ['1. Thiết kế kiến trúc frontend', 'Thiết kế kiến trúc frontend'],
      ['01. Đón khách & check-in sáng', 'Đón khách & check-in sáng'],
      ['04. Workshop: Đánh giá chất lượng', 'Workshop: Đánh giá chất lượng'],
      ['10. Trang bị MacBook Pro M3 Max', 'Trang bị MacBook Pro M3 Max'],
      ['1) Tối ưu hiệu năng canvas', 'Tối ưu hiệu năng canvas'],
      ['01) Khởi động dự án', 'Khởi động dự án'],
      ['(1) Thử nghiệm tính năng', 'Thử nghiệm tính năng'],
      ['[01] Triển khai bản vá', 'Triển khai bản vá'],
      ['1: Lập kế hoạch', 'Lập kế hoạch'],
      ['01: Khảo sát người dùng', 'Khảo sát người dùng'],
      ['1 - Phân tích hệ thống', 'Phân tích hệ thống'],
      ['01 – Phân tích hệ thống', 'Phân tích hệ thống'],
      ['1— Thiết kế cơ sở dữ liệu', 'Thiết kế cơ sở dữ liệu'],
      ['1/ Tiếp nhận yêu cầu', 'Tiếp nhận yêu cầu'],
      ['01/ Nghiên cứu thị trường', 'Nghiên cứu thị trường'],
      ['I. Kiến trúc microservices', 'Kiến trúc microservices'],
      ['II. Tích hợp thanh toán', 'Tích hợp thanh toán'],
      ['iv. Tối ưu hiệu năng', 'Tối ưu hiệu năng'],
      ['A. Phân tích nghiệp vụ', 'Phân tích nghiệp vụ'],
      ['B) Thiết kế chi tiết', 'Thiết kế chi tiết'],
      ['Bước 1: Nộp hồ sơ trực tuyến', 'Nộp hồ sơ trực tuyến'],
      ['Bước 01. Điền biểu mẫu', 'Điền biểu mẫu'],
      ['Bước 1 - Phỏng vấn chuyên môn', 'Phỏng vấn chuyên môn'],
      ['Bước 1 Nhận kết quả', 'Nhận kết quả'],
      ['CHẶNG 01: Nhập môn', 'Nhập môn'],
      ['Mục 02. Quyền lợi nhân viên', 'Quyền lợi nhân viên'],
      ['Phần 1: Giới thiệu chung', 'Giới thiệu chung'],
      ['Điều 1. Phạm vi áp dụng', 'Phạm vi áp dụng'],
      ['Khoản 2. Trách nhiệm bên A', 'Trách nhiệm bên A'],
      ['Step 1: Submit your CV online', 'Submit your CV online'],
      ['Step 02 - Technical screening', 'Technical screening'],
      ['Phase 1: Discovery & Planning', 'Discovery & Planning'],
    ];

    for (const [input, expected] of numberedCases) {
      const actual = stripLeadingEnumeration(input);
      assert.equal(actual, expected, `stripLeadingEnumeration("${input}") should be "${expected}", got "${actual}"`);
    }
    console.log(`✓ Passed: ${numberedCases.length} numbered formats correctly stripped of enumeration prefix`);
  }

  // --- Test 2: Protected meaningful numeric content ---
  console.log('\n--- Test 2: Protected meaningful numeric content (Must NOT strip) ---');
  {
    const numericProtectedCases = [
      ['45 - 65 triệu', '45 - 65 triệu'],
      ['45-65 triệu', '45-65 triệu'],
      ['30-50 triệu VND', '30-50 triệu VND'],
      ['15.000.000 VNĐ', '15.000.000 VNĐ'],
      ['$5000 / month', '$5000 / month'],
      ['1.5 triệu đồng', '1.5 triệu đồng'],
      ['4.5 sao đánh giá', '4.5 sao đánh giá'],
      ['9.8/10 điểm đánh giá', '9.8/10 điểm đánh giá'],
      ['15/10/2026', '15/10/2026'],
      ['15/10/2026 - 20/10/2026', '15/10/2026 - 20/10/2026'],
      ['24/7 hỗ trợ kỹ thuật', '24/7 hỗ trợ kỹ thuật'],
      ['30% ưu đãi đặc biệt', '30% ưu đãi đặc biệt'],
      ['100% remote', '100% remote'],
      ['3 years of experience', '3 years of experience'],
      ['5 năm kinh nghiệm làm việc', '5 năm kinh nghiệm làm việc'],
      ['3 - 5 năm kinh nghiệm', '3 - 5 năm kinh nghiệm'],
      ['1 - 2 năm', '1 - 2 năm'],
      ['08:30 sáng đón khách', '08:30 sáng đón khách'],
      ['Top 10 giải pháp AI', 'Top 10 giải pháp AI'],
      ['2026 AI Summit', '2026 AI Summit'],
    ];

    for (const [input, expected] of numericProtectedCases) {
      const actual = stripLeadingEnumeration(input);
      assert.equal(actual, expected, `Protected numeric "${input}" should NOT be stripped, got "${actual}"`);
    }
    console.log(`✓ Passed: ${numericProtectedCases.length} meaningful numeric formats preserved without stripping`);
  }

  // --- Test 3: Mixed numbered with numeric values & un-numbered content ---
  console.log('\n--- Test 3: Mixed numbered with numeric values & un-numbered content ---');
  {
    const mixedCases = [
      ['1. 45 - 65 triệu', '45 - 65 triệu'],
      ['2. 100% remote', '100% remote'],
      ['3. 3 years experience', '3 years experience'],
      ['4. 15/10/2026 khai mạc', '15/10/2026 khai mạc'],
      ['5. Giảm 30% cho khách hàng mới', 'Giảm 30% cho khách hàng mới'],
      ['6. Lương 45 - 65 triệu / tháng', 'Lương 45 - 65 triệu / tháng'],
      ['Thiết kế kiến trúc frontend hiện đại', 'Thiết kế kiến trúc frontend hiện đại'],
      ['Bảo hiểm sức khỏe toàn diện', 'Bảo hiểm sức khỏe toàn diện'],
      ['', ''],
      [null, ''],
      [undefined, ''],
      ['   ', ''],
    ];

    for (const [input, expected] of mixedCases) {
      const actual = stripLeadingEnumeration(input);
      assert.equal(actual, expected, `Mixed case "${input}" should produce "${expected}", got "${actual}"`);
    }
    console.log(`✓ Passed: ${mixedCases.length} mixed & un-numbered cases verified`);
  }

  // --- Test 4: Concept Story Renderer (recruitment-announcement, 10 items, 4 balanced pages) ---
  console.log('\n--- Test 4: Concept Story Renderer 10 items (recruitment-announcement) ---');
  {
    const fields = {
      role: 'Senior Product Engineer',
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

    const copy = makeIndustryCopy('recruitment', fields);
    assert.equal(copy.points.length, 10, 'Concept copy must contain exactly 10 points');

    const conceptState = {
      industry: 'recruitment',
      categoryId: 'recruitment',
      conceptId: 'recruitment-announcement',
      industryFields: fields,
      brand: 'MIVY · QC BALANCED 10',
      name: copy.headline,
      details: copy.caption,
      goal: '',
      offer: '',
      aspect: '4:5',
      theme: 'tech_dark',
      selected: 'story',
      outputLanguage: 'vi',
      storyPage: 0,
      storyPerPage: 3,
      copies: { launch: { ...copy }, story: { ...copy }, action: { ...copy } },
    };

    const resolved = resolveStorySource(conceptState, conceptState.copies.story);
    assert.equal(resolved.totalPages, 4, '10 items at perPage=3 must yield 4 pages');
    assert.deepEqual(
      resolved.pages.map((p) => p.length),
      [3, 3, 2, 2],
      '10 items must be balanced as [3, 3, 2, 2]'
    );

    // Page 1: Items 1, 2, 3 (expect decorative 01, 02, 03; NO duplicate 1., 2., 3.)
    const cP1 = createRecordingCanvas(1080, 1350);
    drawIndustryPoster(cP1, conceptState, 'story', conceptState.copies.story, null, null);
    const tP1 = cP1.texts.join(' | ');

    assert.ok(tP1.includes('01'), 'Page 1 must render decorative 01');
    assert.ok(tP1.includes('02'), 'Page 1 must render decorative 02');
    assert.ok(tP1.includes('03'), 'Page 1 must render decorative 03');
    assert.ok(!tP1.includes('1. Thiết kế'), 'Page 1 must NOT contain raw "1. Thiết kế"');
    assert.ok(!tP1.includes('2. Tối ưu'), 'Page 1 must NOT contain raw "2. Tối ưu"');
    assert.ok(!tP1.includes('3. Xây dựng'), 'Page 1 must NOT contain raw "3. Xây dựng"');
    assert.ok(tP1.includes('Thiết kế kiến trúc frontend hiện đại'), 'Page 1 must contain stripped text for item 1');
    assert.ok(tP1.includes('Tối ưu hiệu năng render canvas 60fps'), 'Page 1 must contain stripped text for item 2');
    assert.ok(tP1.includes('Xây dựng hệ thống kiểm thử tự động'), 'Page 1 must contain stripped text for item 3');

    // Page 2: Items 4, 5, 6 (expect decorative 04, 05, 06; NO duplicate 4., 5., 6.)
    const cP2 = createRecordingCanvas(1080, 1350);
    drawIndustryPoster(cP2, { ...conceptState, storyPage: 1 }, 'story', conceptState.copies.story, null, null);
    const tP2 = cP2.texts.join(' | ');

    assert.ok(tP2.includes('04'), 'Page 2 must render decorative 04');
    assert.ok(tP2.includes('05'), 'Page 2 must render decorative 05');
    assert.ok(tP2.includes('06'), 'Page 2 must render decorative 06');
    assert.ok(!tP2.includes('4. Phối hợp'), 'Page 2 must NOT contain raw "4. Phối hợp"');
    assert.ok(!tP2.includes('5. Review'), 'Page 2 must NOT contain raw "5. Review"');
    assert.ok(!tP2.includes('6. Thưởng'), 'Page 2 must NOT contain raw "6. Thưởng"');
    assert.ok(tP2.includes('Phối hợp chặt chẽ cùng đội ngũ Product'), 'Page 2 must contain stripped text for item 4');
    assert.ok(tP2.includes('Review code và hướng dẫn thành viên mới'), 'Page 2 must contain stripped text for item 5');
    assert.ok(tP2.includes('Thưởng hiệu suất 2 lần mỗi năm'), 'Page 2 must contain stripped text for item 6');

    // Page 3: Items 7, 8 (expect decorative 07, 08; NO duplicate 7., 8.)
    const cP3 = createRecordingCanvas(1080, 1350);
    drawIndustryPoster(cP3, { ...conceptState, storyPage: 2 }, 'story', conceptState.copies.story, null, null);
    const tP3 = cP3.texts.join(' | ');

    assert.ok(tP3.includes('07'), 'Page 3 must render decorative 07');
    assert.ok(tP3.includes('08'), 'Page 3 must render decorative 08');
    assert.ok(!tP3.includes('7. Bảo hiểm'), 'Page 3 must NOT contain raw "7. Bảo hiểm"');
    assert.ok(!tP3.includes('8. Ngân sách'), 'Page 3 must NOT contain raw "8. Ngân sách"');
    assert.ok(tP3.includes('Bảo hiểm sức khỏe toàn diện cho gia đình'), 'Page 3 must contain stripped text for item 7');
    assert.ok(tP3.includes('Ngân sách học tập & hội thảo 20 triệu/năm'), 'Page 3 must contain stripped text for item 8');

    // Page 4: Items 9, 10 (expect decorative 09, 10; NO duplicate 9., 10.)
    const cP4 = createRecordingCanvas(1080, 1350);
    drawIndustryPoster(cP4, { ...conceptState, storyPage: 3 }, 'story', conceptState.copies.story, null, null);
    const tP4 = cP4.texts.join(' | ');

    assert.ok(tP4.includes('09'), 'Page 4 must render decorative 09');
    assert.ok(tP4.includes('10'), 'Page 4 must render decorative 10');
    assert.ok(!tP4.includes('9. Chế độ'), 'Page 4 must NOT contain raw "9. Chế độ"');
    assert.ok(!tP4.includes('10. Trang bị'), 'Page 4 must NOT contain raw "10. Trang bị"');
    assert.ok(tP4.includes('Chế độ làm việc hybrid linh hoạt'), 'Page 4 must contain stripped text for item 9');
    assert.ok(tP4.includes('Trang bị MacBook Pro M3 Max'), 'Page 4 must contain stripped text for item 10');

    console.log('✓ Passed: Concept story 10 items across 4 balanced pages verified without double enumeration');
  }

  // --- Test 5: Legacy Agenda Renderer (5 items, 2 pages) ---
  console.log('\n--- Test 5: Legacy Agenda Renderer (catalog-renderer) ---');
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
      theme: 'tech_dark',
      selected: 'story',
      outputLanguage: 'vi',
      storyPage: 0,
      storyPerPage: 3,
      copies: { launch: { ...copy }, story: { ...copy }, action: { ...copy } },
    };

    // Page 1: Items 1, 2, 3 (expect circle badge 1, 2, 3; NO duplicate 01., 02., 03.)
    const cAgendaP1 = createRecordingCanvas(1080, 1350);
    drawIndustryPoster(cAgendaP1, agendaState, 'story', agendaState.copies.story, null, null);
    const tAgendaP1 = cAgendaP1.texts.join(' | ');

    assert.ok(tAgendaP1.includes('1'), 'Agenda Page 1 must render circle index 1');
    assert.ok(tAgendaP1.includes('2'), 'Agenda Page 1 must render circle index 2');
    assert.ok(tAgendaP1.includes('3'), 'Agenda Page 1 must render circle index 3');
    assert.ok(!tAgendaP1.includes('01. Đón khách'), 'Agenda Page 1 must NOT contain raw "01. Đón khách"');
    assert.ok(!tAgendaP1.includes('02. Keynote'), 'Agenda Page 1 must NOT contain raw "02. Keynote"');
    assert.ok(!tAgendaP1.includes('03. Panel'), 'Agenda Page 1 must NOT contain raw "03. Panel"');
    assert.ok(tAgendaP1.includes('Đón khách & check-in sáng'), 'Agenda Page 1 must contain stripped text for item 1');
    assert.ok(tAgendaP1.includes('Keynote: AI Agents'), 'Agenda Page 1 must contain stripped text for item 2');
    assert.ok(tAgendaP1.includes('Panel: Kiến trúc'), 'Agenda Page 1 must contain stripped text for item 3');

    // Page 2: Items 4, 5 (expect circle badge 1, 2; NO duplicate 04., 05.)
    const cAgendaP2 = createRecordingCanvas(1080, 1350);
    drawIndustryPoster(cAgendaP2, { ...agendaState, storyPage: 1 }, 'story', agendaState.copies.story, null, null);
    const tAgendaP2 = cAgendaP2.texts.join(' | ');

    assert.ok(tAgendaP2.includes('1'), 'Agenda Page 2 must render circle index 1');
    assert.ok(tAgendaP2.includes('2'), 'Agenda Page 2 must render circle index 2');
    assert.ok(!tAgendaP2.includes('04. Workshop'), 'Agenda Page 2 must NOT contain raw "04. Workshop"');
    assert.ok(!tAgendaP2.includes('05. Networking'), 'Agenda Page 2 must NOT contain raw "05. Networking"');
    assert.ok(tAgendaP2.includes('Workshop: Đánh giá chất lượng hệ thống'), 'Agenda Page 2 must contain stripped text for item 4');
    assert.ok(tAgendaP2.includes('Networking & tổng kết chương trình'), 'Agenda Page 2 must contain stripped text for item 5');

    console.log('✓ Passed: Legacy agenda 5 items across 2 pages verified without double enumeration');
  }

  // --- Test 6: Raw source, resolver & draft immutability ---
  console.log('\n--- Test 6: Source Resolver & Draft Immutability ---');
  {
    const rawDetails = [
      '1. Thiết kế kiến trúc frontend hiện đại',
      '2. Tối ưu hiệu năng render canvas 60fps',
      '3. Xây dựng hệ thống kiểm thử tự động',
    ];
    const testState = {
      industry: 'general',
      categoryId: 'event',
      details: rawDetails.join('\n'),
      aspect: '4:5',
      theme: 'tech_dark',
      selected: 'story',
      storyPage: 0,
      storyPerPage: 3,
      copies: {
        story: {
          headline: 'Hội thảo công nghệ',
          subline: '',
          cta: 'Đăng ký',
          caption: '',
          points: [...rawDetails],
          pointsEdited: false,
        },
      },
    };

    // 1. Resolver must return raw points intact (no mutation of draft state)
    const resolved = resolveStorySource(testState, testState.copies.story);
    assert.deepEqual(
      resolved.items,
      rawDetails,
      'resolveStorySource must preserve raw points with prefixes intact'
    );
    assert.deepEqual(
      resolved.pageItems,
      rawDetails,
      'resolveStorySource.pageItems must preserve raw points with prefixes intact'
    );
    assert.deepEqual(
      testState.copies.story.points,
      rawDetails,
      'State copy points must remain unmodified'
    );

    // 2. Rendering must NOT mutate state points
    const c = createRecordingCanvas(1080, 1350);
    drawIndustryPoster(c, testState, 'story', testState.copies.story, null, null);
    assert.deepEqual(
      testState.copies.story.points,
      rawDetails,
      'Rendering on canvas must not mutate state.copies.story.points'
    );

    // 3. Balanced pagination remains 3/3/2/2 for 10 items
    const tenItems = Array.from({ length: 10 }, (_, i) => `${i + 1}. Mục thứ ${i + 1}`);
    const pages = balancedPages(tenItems, 3);
    assert.deepEqual(
      pages.map((p) => p.length),
      [3, 3, 2, 2],
      '10 items at perPage=3 must remain balanced as 3/3/2/2'
    );

    // 4. Intentional empty remains 0 items
    const emptyResolved = resolveStorySource({
      ...testState,
      copies: {
        story: {
          ...testState.copies.story,
          points: [],
          pointsEdited: true,
        },
      },
    });
    assert.equal(emptyResolved.items.length, 0, 'Intentional empty must remain 0 items');

    console.log('✓ Passed: Raw source resolver, draft immutability, balanced pagination, and intentional empty verified');
  }

  // --- Test 7: Export Parity (Preview vs Single Export vs ZIP Export) ---
  console.log('\n--- Test 7: Export Parity (Preview canvas vs Offscreen export canvas) ---');
  {
    const fields = {
      role: 'Senior Product Engineer',
      salary: '45 - 65 triệu',
      location: 'Quận 1, TP.HCM',
      requirements: '1. Thiết kế kiến trúc\n2. Tối ưu canvas\n3. Kiểm thử tự động',
      benefits: '4. Thưởng hiệu suất\n5. Bảo hiểm sức khỏe',
      contact: 'careers@mivy.vn',
    };
    const copy = makeIndustryCopy('recruitment', fields);
    const state = {
      industry: 'recruitment',
      categoryId: 'recruitment',
      conceptId: 'recruitment-announcement',
      industryFields: fields,
      brand: 'MIVY · QC PARITY',
      name: copy.headline,
      details: copy.caption,
      aspect: '4:5',
      theme: 'tech_dark',
      selected: 'story',
      outputLanguage: 'vi',
      storyPage: 0,
      storyPerPage: 3,
      copies: { launch: { ...copy }, story: { ...copy }, action: { ...copy } },
    };

    // Preview canvas
    const previewCanvas = createRecordingCanvas(1080, 1350);
    drawIndustryPoster(previewCanvas, state, 'story', state.copies.story, null, null);

    // Offscreen single export canvas
    const exportCanvas = createRecordingCanvas(1080, 1350);
    drawIndustryPoster(exportCanvas, structuredClone(state), 'story', state.copies.story, null, null);

    // Offscreen ZIP export canvas
    const zipCanvas = createRecordingCanvas(1080, 1350);
    drawIndustryPoster(zipCanvas, structuredClone(state), 'story', state.copies.story, null, null);

    assert.deepEqual(
      previewCanvas.texts,
      exportCanvas.texts,
      'Preview canvas and single export canvas must produce identical text sequences'
    );
    assert.deepEqual(
      exportCanvas.texts,
      zipCanvas.texts,
      'Single export canvas and ZIP export canvas must produce identical text sequences'
    );

    console.log('✓ Passed: Preview, Single Export, and ZIP Export canvases produce 100% identical text sequences');
  }

  console.log('\n=== ALL 7 STORY NUMBERING & DISPLAY PARITY QC TESTS PASSED 100%! ===');
}

runAllTests().catch((err) => {
  console.error('STORY NUMBERING QC TEST FAILED:', err);
  process.exit(1);
});
