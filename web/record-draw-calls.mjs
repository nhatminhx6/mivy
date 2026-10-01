import { writeFileSync } from 'node:fs';

function createRecordingCanvas(width = 1080, height = 1350) {
  const commands = [];
  const stateStack = [];
  const transformStack = [];
  let currentTx = 0;
  let currentTy = 0;
  let state = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '16px sans-serif',
    textBaseline: 'alphabetic',
    textAlign: 'start',
    globalAlpha: 1.0,
  };

  const ctx = {
    canvas: { width, height },
    save() {
      stateStack.push({ ...state });
      transformStack.push({ tx: currentTx, ty: currentTy });
      commands.push({ op: 'save' });
    },
    restore() {
      if (stateStack.length) {
        state = stateStack.pop();
      }
      if (transformStack.length) {
        const t = transformStack.pop();
        currentTx = t.tx;
        currentTy = t.ty;
      }
      commands.push({ op: 'restore' });
    },
    beginPath() { commands.push({ op: 'beginPath' }); },
    closePath() { commands.push({ op: 'closePath' }); },
    clip() { commands.push({ op: 'clip' }); },
    rect(x, y, w, h) { commands.push({ op: 'rect', x: x + currentTx, y: y + currentTy, w, h }); },
    roundRect(x, y, w, h, r) { commands.push({ op: 'roundRect', x: x + currentTx, y: y + currentTy, w, h, r: Array.isArray(r) ? r[0] : (r || 0) }); },
    strokeRect(x, y, w, h) { commands.push({ op: 'strokeRect', x: x + currentTx, y: y + currentTy, w, h, strokeStyle: state.strokeStyle, lineWidth: state.lineWidth }); },
    clearRect(x, y, w, h) { commands.push({ op: 'clearRect', x: x + currentTx, y: y + currentTy, w, h }); },
    fillRect(x, y, w, h) {
      commands.push({ op: 'fillRect', x: x + currentTx, y: y + currentTy, w, h, fillStyle: typeof state.fillStyle === 'string' ? state.fillStyle : '#1a1f2c' });
    },
    stroke() { commands.push({ op: 'stroke', strokeStyle: typeof state.strokeStyle === 'string' ? state.strokeStyle : '#334155', lineWidth: state.lineWidth }); },
    fill() { commands.push({ op: 'fill', fillStyle: typeof state.fillStyle === 'string' ? state.fillStyle : '#1a1f2c' }); },
    moveTo(x, y) { commands.push({ op: 'moveTo', x: x + currentTx, y: y + currentTy }); },
    lineTo(x, y) { commands.push({ op: 'lineTo', x: x + currentTx, y: y + currentTy }); },
    quadraticCurveTo(cpx, cpy, x, y) { commands.push({ op: 'quadraticCurveTo', cpx: cpx + currentTx, cpy: cpy + currentTy, x: x + currentTx, y: y + currentTy }); },
    bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) { commands.push({ op: 'bezierCurveTo', cp1x: cp1x + currentTx, cp1y: cp1y + currentTy, cp2x: cp2x + currentTx, cp2y: cp2y + currentTy, x: x + currentTx, y: y + currentTy }); },
    arc(x, y, radius, startAngle, endAngle) { commands.push({ op: 'arc', x: x + currentTx, y: y + currentTy, radius, startAngle, endAngle }); },
    arcTo() {},
    ellipse() {},
    translate(x, y) {
      currentTx += x;
      currentTy += y;
    },
    rotate() {},
    scale() {},
    transform() {},
    setTransform() {},
    drawImage() {},
    createLinearGradient(x0, y0, x1, y1) {
      return {
        addColorStop() {},
      };
    },
    createRadialGradient() {
      return {
        addColorStop() {},
      };
    },
    createPattern() { return null; },
    measureText(text) {
      const match = (state.font || '').match(/(\d+)px/);
      const fontSize = match ? parseInt(match[1], 10) : 16;
      return { width: (text || '').length * (fontSize * 0.58) };
    },
    fillText(text, x, y) {
      commands.push({
        op: 'fillText',
        text: String(text),
        x: x + currentTx,
        y: y + currentTy,
        font: state.font,
        fillStyle: typeof state.fillStyle === 'string' ? state.fillStyle : '#ffffff',
        textBaseline: state.textBaseline,
        textAlign: state.textAlign,
      });
    },
    set strokeStyle(v) { state.strokeStyle = v; },
    get strokeStyle() { return state.strokeStyle; },
    set fillStyle(v) { state.fillStyle = v; },
    get fillStyle() { return state.fillStyle; },
    set lineWidth(v) { state.lineWidth = v; },
    get lineWidth() { return state.lineWidth; },
    set globalAlpha(v) { state.globalAlpha = v; },
    get globalAlpha() { return state.globalAlpha; },
    set textBaseline(v) { state.textBaseline = v; },
    get textBaseline() { return state.textBaseline; },
    set textAlign(v) { state.textAlign = v; },
    get textAlign() { return state.textAlign; },
    set font(v) { state.font = v; },
    get font() { return state.font; },
    set shadowColor(v) {},
    set shadowBlur(v) {},
    set shadowOffsetY(v) {},
  };

  return {
    width,
    height,
    getContext() { return ctx; },
    getCommands() { return commands; },
  };
}

async function record() {
  const { drawIndustryPoster, POSTER_THEMES } = await import('./dist_test/lib/design-engine.js');
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

  const stateMixed = {
    brand: 'MIVY STUDIO',
    name: 'Lead / Senior Software Engineer',
    industry: 'recruitment',
    theme: 'emerald_pro',
    outputLanguage: 'preserve',
    storyPage: 0,
    storyPerPage: 3,
    offer: '35 - 55 triệu VNĐ + Thưởng dự án',
    details: jdEightPointsMixed.join('\n'),
    copies: {
      launch: {
        headline: 'Lead/Senior Software Engineer',
        subline: 'Gia nhập đội ngũ cốt lõi xây dựng sản phẩm',
        cta: 'Ứng tuyển ngay',
        caption: 'Tìm kiếm đồng đội...',
        points: jdEightPointsMixed,
      },
      story: {
        headline: 'Tiêu chuẩn & Trách nhiệm kỹ thuật',
        subline: 'Những gì bạn sẽ cùng team chinh phục',
        cta: 'Xem chi tiết',
        caption: 'Chi tiết công việc...',
        points: jdEightPointsMixed,
      },
      action: {
        headline: 'Quy trình gia nhập đội ngũ',
        subline: '3 bước tinh gọn để bắt đầu',
        cta: 'Gửi hồ sơ ngay',
        caption: 'Gửi CV...',
        points: [
          'Vòng 1: Trao đổi văn hóa & kinh nghiệm (Online)',
          'Vòng 2: Phỏng vấn kỹ thuật & system design',
          'Vòng 3: Thảo luận đãi ngộ & onboard',
        ],
      },
    },
  };

  const renders = {};

  // 1. Hero
  const cHero = createRecordingCanvas(1080, 1350);
  drawIndustryPoster(cHero, stateMixed, 'launch', stateMixed.copies.launch, null, null);
  renders['hero'] = cHero.getCommands();

  // 2. Story Page 1
  const cStory1 = createRecordingCanvas(1080, 1350);
  drawIndustryPoster(cStory1, { ...stateMixed, storyPage: 0 }, 'story', stateMixed.copies.story, null, null);
  renders['story_p1'] = cStory1.getCommands();

  // 3. Story Page 2
  const cStory2 = createRecordingCanvas(1080, 1350);
  drawIndustryPoster(cStory2, { ...stateMixed, storyPage: 1 }, 'story', stateMixed.copies.story, null, null);
  renders['story_p2'] = cStory2.getCommands();

  // 4. Story Page 3
  const cStory3 = createRecordingCanvas(1080, 1350);
  drawIndustryPoster(cStory3, { ...stateMixed, storyPage: 2 }, 'story', stateMixed.copies.story, null, null);
  renders['story_p3'] = cStory3.getCommands();

  // 5. Action
  const cAction = createRecordingCanvas(1080, 1350);
  drawIndustryPoster(cAction, stateMixed, 'action', stateMixed.copies.action, null, null);
  renders['action'] = cAction.getCommands();

  const outPath = '/Users/minh.nn1/.gemini/antigravity/brain/3f16b73d-1489-49c4-a5a4-08346785b3e0/scratch/draw_calls.json';
  writeFileSync(outPath, JSON.stringify(renders, null, 2), 'utf8');
  console.log(`Đã xuất draw calls thành công ra: ${outPath}`);
}

record().catch(err => {
  console.error('Lỗi record:', err);
  process.exit(1);
});
