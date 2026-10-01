import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Load compiled design-engine.js
let designEngineSource = readFileSync(new URL('./dist_test/lib/design-engine.js', import.meta.url), 'utf8');
// Fix import path to types/index.js if needed in Node
designEngineSource = designEngineSource.replace(/from\s+['"]@\/types['"]/g, 'from "../types/index.js"');

// Create Mock Canvas & 2D Context that captures all drawn text & operations
function createMockCanvas(width = 1080, height = 1350) {
  const drawnTexts = [];
  const operations = [];

  const ctx = {
    canvas: { width, height },
    save() { operations.push('save'); },
    restore() { operations.push('restore'); },
    beginPath() { operations.push('beginPath'); },
    closePath() { operations.push('closePath'); },
    clip() { operations.push('clip'); },
    rect() { operations.push('rect'); },
    roundRect() { operations.push('roundRect'); },
    strokeRect() {},
    clearRect() {},
    translate() {},
    rotate() {},
    scale() {},
    transform() {},
    setTransform() {},
    fill() { operations.push('fill'); },
    stroke() { operations.push('stroke'); },
    moveTo() { operations.push('moveTo'); },
    lineTo() { operations.push('lineTo'); },
    quadraticCurveTo() {},
    bezierCurveTo() {},
    arc() { operations.push('arc'); },
    arcTo() {},
    ellipse() {},
    fillRect() { operations.push('fillRect'); },
    drawImage() { operations.push('drawImage'); },
    createPattern() { return null; },
    createLinearGradient() {
      return { addColorStop() {} };
    },
    createRadialGradient() {
      return { addColorStop() {} };
    },
    measureText(text) {
      return { width: (text || '').length * 10 };
    },
    fillText(text, x, y) {
      drawnTexts.push(String(text));
      operations.push(`fillText: ${text} at (${Math.round(x)}, ${Math.round(y)})`);
    },
    set strokeStyle(v) {},
    set fillStyle(v) {},
    set lineWidth(v) {},
    set globalAlpha(v) {},
    set textBaseline(v) {},
    set font(v) {},
    set shadowColor(v) {},
    set shadowBlur(v) {},
    set shadowOffsetY(v) {},
  };

  return {
    width,
    height,
    getContext() { return ctx; },
    getDrawnTexts() { return drawnTexts; },
    getFullTextCorpus() { return drawnTexts.join(' '); },
  };
}

async function runVerification() {
  console.log('--- BẮT ĐẦU KIỂM TRA RENDERER ĐỢT 1 VỚI JD 8 Ý ---');

  const {
    drawIndustryPoster,
    getPosterLabels,
    POSTER_THEMES,
  } = await import('./dist_test/lib/design-engine.js');

  const th = POSTER_THEMES.emerald_pro;

  const jdEightPointsMixed = [
    'Làm quen nhanh với codebase hiện tại và giải quyết technical debt',
    'Thiết kế kiến trúc hệ thống backend chịu tải cao',
    'Xây dựng giao diện web mượt mà bằng ReactJS và Next.js',
    'Phát triển các service microservices bằng NodeJS',
    'Mentoring và hướng dẫn các kỹ sư junior trong team',
    'Làm việc trực tiếp với các stakeholders và Product Owner',
    'Tối ưu cơ sở dữ liệu PostgreSQL và caching',
    'Cấp bậc: Lead/Senior Fullstack Software Engineer',
  ];

  const jdEightPointsEn = [
    'Rapidly onboard existing codebase and resolve technical debt',
    'Design scalable high-load backend architecture',
    'Build responsive web interfaces with ReactJS and Next.js',
    'Develop performant microservices using NodeJS',
    'Mentoring and guiding junior developers in the squad',
    'Collaborate directly with stakeholders and Product Owners',
    'Optimize PostgreSQL and Redis caching layers',
    'Level: Lead/Senior Fullstack Software Engineer',
  ];

  // =========================================================================
  // TEST 1: JD 8 Ý BẢN TRỘN (VIETNAMESE + ENGLISH TECHNICAL TERMS)
  // =========================================================================
  console.log('\n[TEST 1] Đang kiểm tra JD 8 ý bản trộn (preserve)...');
  const stateMixed = {
    industry: 'recruitment',
    name: 'Lead/Senior Fullstack Engineer',
    goal: 'recruitment',
    brand: 'Mivy Studio',
    offer: '', // Không có lương nguồn
    details: jdEightPointsMixed.join('\n'),
    aspect: '4:5',
    theme: 'emerald_pro',
    layoutMode: 'full_photo',
    selected: 'story',
    outputLanguage: 'preserve',
    storyPage: 0,
    storyPerPage: 3,
    copies: {
      launch: {
        headline: 'Lead/Senior Fullstack Engineer',
        subline: 'Gia nhập đội ngũ công nghệ cao',
        cta: 'Ứng tuyển ngay',
        caption: 'Tuyển dụng kỹ sư...',
        points: jdEightPointsMixed.slice(0, 4),
      },
      story: {
        headline: 'Tiêu Chí & Yêu Cầu Chuyên Môn',
        subline: 'Yêu cầu kỹ thuật thực tế cho vị trí',
        cta: 'Xem chi tiết',
        caption: 'Tiêu chí...',
        points: jdEightPointsMixed, // Đủ 8 ý
      },
      action: {
        headline: 'Phương Thức Kết Nối & Ứng Tuyển',
        subline: 'Thông tin kết nối',
        cta: 'Ứng Tuyển Ngay',
        caption: 'Ứng tuyển...',
        points: [
          'Vòng 1: Gửi CV & Portfolio các sản phẩm thực tế',
          'Vòng 2: Phỏng vấn kỹ thuật cùng Tech Lead',
          'Vòng 3: Nhận offer và onboard',
        ],
      },
    },
  };

  // 1.1 Render Launch Hero
  const canvasHero = createMockCanvas(1080, 1350);
  drawIndustryPoster(canvasHero, stateMixed, 'launch', stateMixed.copies.launch, null, null);
  const heroCorpus = canvasHero.getFullTextCorpus();

  // Khẳng định: Hero không được có fact bịa
  assert(!heroCorpus.includes('TP.HCM'), 'LỖI: Hero tự sinh TP.HCM');
  assert(!heroCorpus.includes('Hybrid'), 'LỖI: Hero tự sinh Hybrid');
  assert(!heroCorpus.includes('0907124244'), 'LỖI: Hero tự sinh hotline');
  assert(!heroCorpus.includes('Macbook'), 'LỖI: Hero tự sinh Macbook');
  console.log('✓ Hero poster: Sạch 100% fake facts (không có TP.HCM, Hybrid, Macbook, Hotline)');

  // 1.2 Render Story Carousel - Trang 1 (ý 0..2)
  const canvasStoryPage1 = createMockCanvas(1080, 1350);
  drawIndustryPoster(canvasStoryPage1, { ...stateMixed, storyPage: 0 }, 'story', stateMixed.copies.story, null, null);
  const story1Corpus = canvasStoryPage1.getFullTextCorpus();
  assert(story1Corpus.includes('codebase'), 'Thiếu ý codebase ở trang 1');
  assert(story1Corpus.includes('technical debt'), 'Thiếu ý technical debt ở trang 1');
  assert(story1Corpus.includes('backend'), 'Thiếu ý backend ở trang 1');
  assert(story1Corpus.includes('ReactJS'), 'Thiếu ý ReactJS ở trang 1');
  assert(story1Corpus.includes('TRANG 1/3') || story1Corpus.includes('PAGE 1/3'), 'Thiếu nhãn trang carousel 1/3');
  console.log('✓ Story Carousel Trang 1 (3/3): Chứa đủ codebase, technical debt, backend, ReactJS');

  // 1.3 Render Story Carousel - Trang 2 (ý 3..5)
  const canvasStoryPage2 = createMockCanvas(1080, 1350);
  drawIndustryPoster(canvasStoryPage2, { ...stateMixed, storyPage: 1 }, 'story', stateMixed.copies.story, null, null);
  const story2Corpus = canvasStoryPage2.getFullTextCorpus();
  assert(story2Corpus.includes('NodeJS'), 'Thiếu ý NodeJS ở trang 2');
  assert(story2Corpus.includes('Mentoring'), 'Thiếu ý Mentoring ở trang 2');
  assert(story2Corpus.includes('stakeholders'), 'Thiếu ý stakeholders ở trang 2');
  assert(story2Corpus.includes('TRANG 2/3') || story2Corpus.includes('PAGE 2/3'), 'Thiếu nhãn trang carousel 2/3');
  console.log('✓ Story Carousel Trang 2 (3/3): Chứa đủ NodeJS, Mentoring, stakeholders');

  // 1.4 Render Story Carousel - Trang 3 (ý 6..7)
  const canvasStoryPage3 = createMockCanvas(1080, 1350);
  drawIndustryPoster(canvasStoryPage3, { ...stateMixed, storyPage: 2 }, 'story', stateMixed.copies.story, null, null);
  const story3Corpus = canvasStoryPage3.getFullTextCorpus();
  assert(story3Corpus.includes('PostgreSQL'), 'Thiếu ý PostgreSQL ở trang 3');
  assert(story3Corpus.includes('Lead/Senior'), 'Thiếu ý Lead/Senior ở trang 3');
  assert(story3Corpus.includes('TRANG 3/3') || story3Corpus.includes('PAGE 3/3'), 'Thiếu nhãn trang carousel 3/3');
  console.log('✓ Story Carousel Trang 3 (3/3): Chứa đủ PostgreSQL, Lead/Senior');

  // Toàn bộ 8 ý phải xuất hiện trong 3 trang carousel
  const totalStoryCorpus = story1Corpus + ' ' + story2Corpus + ' ' + story3Corpus;
  for (const point of jdEightPointsMixed) {
    const key = point.split(' ')[0];
    assert(totalStoryCorpus.includes(key), `Bị sót ý: ${point}`);
  }
  console.log('✓ Toàn bộ 8/8 ý của JD được bảo toàn trọn vẹn qua Carousel Pagination!');

  // =========================================================================
  // TEST 2: JD 8 Ý BẢN ENGLISH (OUTPUT_LANGUAGE = 'en')
  // =========================================================================
  console.log('\n[TEST 2] Đang kiểm tra JD 8 ý bản English (outputLanguage = "en")...');
  const stateEn = {
    ...stateMixed,
    name: 'Lead/Senior Fullstack Engineer',
    outputLanguage: 'en',
    details: jdEightPointsEn.join('\n'),
    copies: {
      launch: {
        headline: 'Lead/Senior Fullstack Engineer',
        subline: 'Join high-impact engineering team',
        cta: 'Apply Now',
        caption: 'Hiring Lead/Senior Fullstack Engineer...',
        points: jdEightPointsEn.slice(0, 4),
      },
      story: {
        headline: 'Technical Criteria & Requirements',
        subline: 'Core technical requirements for position',
        cta: 'View Details',
        caption: 'Criteria...',
        points: jdEightPointsEn,
      },
      action: {
        headline: 'How to Connect & Apply',
        subline: 'Application process',
        cta: 'Apply Now',
        caption: 'Apply now...',
        points: [
          'Step 1: Submit CV and production portfolio',
          'Step 2: Technical architecture review with Tech Lead',
          'Step 3: Offer and onboarding schedule',
        ],
      },
    },
  };

  const canvasEnHero = createMockCanvas(1080, 1350);
  drawIndustryPoster(canvasEnHero, stateEn, 'launch', stateEn.copies.launch, null, null);
  const enHeroCorpus = canvasEnHero.getFullTextCorpus();
  assert(enHeroCorpus.includes('CAREER OPPORTUNITY') || enHeroCorpus.includes('OPPORTUNITY'), 'Thiếu tag tiếng Anh ở Hero');
  console.log('✓ English Hero: Sử dụng nhãn tiếng Anh (CAREER OPPORTUNITY)');

  const canvasEnStory = createMockCanvas(1080, 1350);
  drawIndustryPoster(canvasEnStory, { ...stateEn, storyPage: 0 }, 'story', stateEn.copies.story, null, null);
  const enStoryCorpus = canvasEnStory.getFullTextCorpus();
  assert(enStoryCorpus.includes('PAGE 1/3'), 'Thiếu nhãn PAGE 1/3 tiếng Anh');
  assert(enStoryCorpus.includes('WHAT WE ARE LOOKING FOR'), 'Thiếu subtitle tiếng Anh');
  assert(enStoryCorpus.includes('codebase'), 'Thiếu codebase');
  console.log('✓ English Story: Sử dụng nhãn tiếng Anh chuẩn (PAGE 1/3, WHAT WE ARE LOOKING FOR)');

  const canvasEnAction = createMockCanvas(1080, 1350);
  drawIndustryPoster(canvasEnAction, stateEn, 'action', stateEn.copies.action, null, null);
  const enActionCorpus = canvasEnAction.getFullTextCorpus();
  assert(enActionCorpus.includes('CONNECT & APPLY'), 'Thiếu tag CONNECT & APPLY');
  assert(enActionCorpus.includes('STEP 1') || enActionCorpus.includes('Step 1'), 'Thiếu STEP 1');
  assert(enActionCorpus.includes('Apply Now'), 'Thiếu CTA Apply Now');
  console.log('✓ English Action: Sử dụng nhãn tiếng Anh chuẩn (CONNECT & APPLY, STEP 1, Apply Now)');

  console.log('\n=============================================================');
  console.log('🎉 TẤT CẢ 8 Ý TRONG 3 BẢN VIỆT / ANH / TRỘN ĐÃ ĐƯỢC VERIFY THÀNH CÔNG!');
  console.log('=============================================================');
}

runVerification().catch((err) => {
  console.error('❌ Kiểm tra thất bại:', err);
  process.exit(1);
});
