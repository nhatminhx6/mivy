import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const designSource = readFileSync(new URL('../web/industry-design.js', import.meta.url), 'utf8');
const marketingSource = readFileSync(new URL('../web/marketing.js', import.meta.url), 'utf8');

function createMockCtx() {
  const calls = [];
  const noop = (...args) => { calls.push(args); };
  const gradient = { addColorStop: noop };
  return {
    calls,
    save: noop,
    restore: noop,
    beginPath: noop,
    closePath: noop,
    rotate: noop,
    translate: noop,
    roundRect: noop,
    arc: noop,
    rect: noop,
    fill: noop,
    stroke: noop,
    clip: noop,
    moveTo: noop,
    lineTo: noop,
    quadraticCurveTo: noop,
    bezierCurveTo: noop,
    fillRect: noop,
    fillText: noop,
    measureText: (text) => ({ width: text.length * 10 }),
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    drawImage: noop,
    set shadowColor(v) {},
    set shadowBlur(v) {},
    set shadowOffsetY(v) {},
    set strokeStyle(v) {},
    set fillStyle(v) {},
    set lineWidth(v) {},
    set lineCap(v) {},
    set lineJoin(v) {},
    set globalAlpha(v) {},
    set textBaseline(v) {},
    set font(v) {},
  };
}

function createMockCanvas(aspect = '4:5') {
  const ctx = createMockCtx();
  return {
    width: 1080,
    height: { '1:1': 1080, '4:5': 1350, '9:16': 1920 }[aspect],
    getContext: () => ctx,
  };
}

test('POSTER_THEMES defines 5 themes with required tokens', () => {
  const scope = {};
  new Function('exports', `${designSource}; exports.POSTER_THEMES = POSTER_THEMES;`)(scope);
  assert.ok(scope.POSTER_THEMES);
  const themes = Object.keys(scope.POSTER_THEMES);
  assert.deepEqual(themes, ['tech_dark', 'warm_editorial', 'bold_vibrant', 'clean_minimal', 'emerald_pro']);
  for (const th of Object.values(scope.POSTER_THEMES)) {
    assert.ok(th.bg);
    assert.ok(th.accent);
    assert.ok(th.textPrimary);
    assert.ok(th.cardBg);
  }
});

test('drawIndustryPoster renders without error across all sectors, kinds, aspects and themes', () => {
  const runner = new Function(
    'marketing',
    'posterText',
    `${designSource}; return { drawIndustryPoster, POSTER_THEMES };`
  );

  const mockPosterText = (ctx, text, x, y, width, maxH, startSize) => {
    ctx.fillText(text, x, y);
    return 40;
  };

  const industries = ['recruitment', 'education', 'service', 'general'];
  const kinds = ['launch', 'story', 'action'];
  const aspects = ['1:1', '4:5', '9:16'];
  const themeKeys = ['tech_dark', 'warm_editorial', 'bold_vibrant', 'clean_minimal', 'emerald_pro'];

  for (const ind of industries) {
    for (const kind of kinds) {
      for (const aspect of aspects) {
        for (const th of themeKeys) {
          const marketing = {
            industry: ind,
            name: 'Lead Fullstack Developer',
            brand: 'Mivy Tech',
            details: '5 năm kinh nghiệm\nLương 25-35 triệu\nThành thạo ReactJS và Node\nChế độ đãi ngộ tốt\nLiên hệ: job@mivy.vn',
            offer: 'Lương 25-35 triệu',
            aspect,
            theme: th,
          };
          const { drawIndustryPoster } = runner(marketing, mockPosterText);
          const canvas = createMockCanvas(aspect);
          const copy = {
            headline: 'Tuyển dụng Lead Developer',
            subline: 'Xây dựng nền tảng cùng chúng em',
            cta: 'Ứng tuyển ngay',
            caption: 'Chi tiết JD công việc',
            points: ['5 năm kinh nghiệm', 'Lương 25-35 triệu', 'React và Python', 'Học hỏi nhanh'],
          };
          assert.doesNotThrow(() => {
            drawIndustryPoster(canvas, kind, copy, null);
          }, `Failed on ${ind} - ${kind} - ${aspect} - ${th}`);
        }
      }
    }
  }
});

test('drawIndustryPoster renders with photo asset and cutout across all configurations', () => {
  const runner = new Function(
    'marketing',
    'posterText',
    `${designSource}; return { drawIndustryPoster, POSTER_THEMES };`
  );

  const mockPosterText = (ctx, text, x, y, width, maxH, startSize) => {
    ctx.fillText(text, x, y);
    return 40;
  };

  const industries = ['recruitment', 'education', 'service', 'general'];
  const kinds = ['launch', 'story', 'action'];
  const photoAsset = {
    im: { width: 1200, height: 800, naturalWidth: 1200, naturalHeight: 800 },
    l: 0,
    t: 0,
    w: 1200,
    h: 800,
  };
  const cutoutAsset = {
    im: { width: 1200, height: 800, naturalWidth: 1200, naturalHeight: 800 },
    l: 100,
    t: 100,
    w: 500,
    h: 400,
  };

  for (const ind of industries) {
    for (const kind of kinds) {
      for (const asset of [photoAsset, cutoutAsset]) {
        const marketing = {
          industry: ind,
          name: 'Senior Engineer',
          brand: 'Mivy Corp',
          details: '5 năm kinh nghiệm\nLương 30-40 triệu',
          offer: 'Lương 30-40 triệu',
          aspect: '4:5',
          theme: 'emerald_pro',
        };
        const { drawIndustryPoster } = runner(marketing, mockPosterText);
        const canvas = createMockCanvas('4:5');
        const copy = {
          headline: 'Tuyển dụng Senior Engineer',
          subline: 'Đồng hành cùng đội ngũ kỹ thuật',
          cta: 'Ứng tuyển ngay',
          caption: 'Chi tiết JD công việc',
          points: ['5 năm kinh nghiệm', 'Lương 30-40 triệu', 'Kiến trúc hệ thống'],
        };
        assert.doesNotThrow(() => {
          drawIndustryPoster(canvas, kind, copy, asset);
        }, `Failed with asset on ${ind} - ${kind}`);
      }
    }
  }
});

