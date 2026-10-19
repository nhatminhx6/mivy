'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MarketingState, AssetInfo } from '@/types';
import { DraftController } from '@/lib/draft-controller';
import {
  persistStateAssets,
  resolveStateAssets,
  openAssetDB,
} from '@/lib/asset-store';
import { drawIndustryPoster } from '@/lib/design-engine';

// QC Namespace riêng biệt - TUYỆT ĐỐI KHÔNG CHẠM DRAFT THẬT
const QC_STORAGE_KEY = 'mivy-qc-marketing-v1';
const QC_DRAFT_KEY = 'mivy-qc-industry-drafts-v2';
const QC_ASSET_DB = 'mivy-qc-assets-v1';
const QC_RELOAD_FLAG = 'mivy_qc_pending_actual_reload';

interface TestResult {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'pass' | 'fail';
  durationMs: number;
  logs: string[];
  idbKeys?: string[];
  error?: string;
  stateDump?: any;
}

// Helper tạo MarketingState hợp lệ với type đầy đủ
function createTestState(overrides: Partial<MarketingState> = {}): MarketingState {
  return {
    industry: 'recruitment',
    categoryId: 'recruitment',
    conceptId: 'recruitment-team',
    name: 'QC Test Headline',
    goal: 'QC Goal Verification',
    details: 'MIVY Native IndexedDB Verification',
    brand: 'MIVY · QC STUDIO',
    offer: 'Quyền lợi hấp dẫn',
    aspect: '4:5',
    theme: 'tech_dark',
    selected: 'launch',
    copies: {
      launch: {
        headline: overrides.name || 'QC Test Headline',
        subline: overrides.details || 'MIVY Studio',
        cta: 'Liên hệ ngay',
        caption: '',
        points: ['Điểm nổi bật 1', 'Điểm nổi bật 2'],
      },
      story: { headline: '', subline: '', cta: '', caption: '', points: [] },
      action: { headline: '', subline: '', cta: '', caption: '', points: [] },
    },
    ...overrides,
  };
}

// 1. Helper tạo ảnh fixture Canvas có bản quyền rõ ràng (100% client generated)
function createMainFixture(text: string, bgColor: string, textColor: string): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 400, 400);

  // Decorative border
  ctx.strokeStyle = textColor;
  ctx.lineWidth = 8;
  ctx.strokeRect(16, 16, 368, 368);

  // Icon / Shape
  ctx.fillStyle = textColor;
  ctx.beginPath();
  ctx.arc(200, 160, 60, 0, Math.PI * 2);
  ctx.fill();

  // Label text
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textColor;
  ctx.fillText(text, 200, 260);

  ctx.font = '14px monospace';
  ctx.fillText('MIVY QC FIXTURE · MAIN', 200, 300);
  ctx.fillText(new Date().toISOString().slice(11, 19), 200, 330);

  return canvas.toDataURL('image/png');
}

function createBgFixture(text: string, gradStart: string, gradEnd: string): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, 600, 800);
  grad.addColorStop(0, gradStart);
  grad.addColorStop(1, gradEnd);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 600, 800);

  // Grid pattern
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 2;
  for (let x = 40; x < 600; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 800);
    ctx.stroke();
  }
  for (let y = 40; y < 800; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(600, y);
    ctx.stroke();
  }

  // Label banner
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(40, 340, 520, 120);

  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 300, 380);

  ctx.font = '16px monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('MIVY QC FIXTURE · BACKGROUND', 300, 420);

  return canvas.toDataURL('image/png');
}

// 2. Helper inspect Native IndexedDB dùng chính openAssetDB có self-healing schema
async function inspectNativeIDB(dbName: string = QC_ASSET_DB): Promise<{ count: number; keys: string[] }> {
  try {
    const db = await openAssetDB(dbName);
    return await new Promise((resolve) => {
      try {
        const tx = db.transaction('assets', 'readonly');
        const store = tx.objectStore('assets');
        const req = store.getAllKeys();
        req.onsuccess = () => {
          const keys = (req.result || []).map(String);
          db.close();
          resolve({ count: keys.length, keys });
        };
        req.onerror = () => {
          db.close();
          resolve({ count: 0, keys: [] });
        };
      } catch {
        db.close();
        resolve({ count: 0, keys: [] });
      }
    });
  } catch {
    return { count: 0, keys: [] };
  }
}

// 3. Helper dọn dẹp chỉ trong QC namespace
async function cleanupQCNamespace() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(QC_STORAGE_KEY);
  window.localStorage.removeItem(QC_DRAFT_KEY);
  if (window.indexedDB) {
    await new Promise<void>((resolve) => {
      const req = window.indexedDB.deleteDatabase(QC_ASSET_DB);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  }
}

// 4. Helper nạp ảnh và render canvas bằng renderer thật của ứng dụng
async function loadImgElement(url?: string): Promise<HTMLImageElement | null> {
  if (!url) return null;
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = url;
  });
}

async function renderStateToCanvas(canvas: HTMLCanvasElement, state: MarketingState) {
  if (typeof document === 'undefined') return;
  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  } catch {}

  const assetUrl = state.cutout || state.image || '';
  const bgUrl = state.backgroundImage || state.bgUrl || '';
  const [assetImg, bgImg] = await Promise.all([
    loadImgElement(assetUrl),
    loadImgElement(bgUrl),
  ]);
  const asset: AssetInfo | null = assetImg
    ? { im: assetImg, l: 0, t: 0, w: assetImg.width, h: assetImg.height }
    : null;
  const copy = state.copies?.launch || {
    headline: state.name || 'QC Poster Headline',
    subline: state.details || '',
    cta: 'Liên hệ ngay',
    caption: '',
    points: [],
  };
  drawIndustryPoster(canvas, state, 'launch', copy, asset, bgImg, null);
}

// 5. Helper tải PNG từ canvas
function downloadCanvasPNG(canvas: HTMLCanvasElement | null, filename: string) {
  if (!canvas) return;
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

export default function BrowserPersistenceQCHarness() {
  // ENFORCE DEV-ONLY (Không chỉ badge UI)
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const [isRunning, setIsRunning] = useState(false);
  const [activeStep, setActiveStep] = useState<string>('');
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [idbRecordCount, setIdbRecordCount] = useState<number>(0);
  const [actualReloadDetected, setActualReloadDetected] = useState(false);

  const [testResults, setTestResults] = useState<Record<string, TestResult>>({
    test1: {
      id: 'test1',
      name: '1. Native IndexedDB Persist & Resolve Roundtrip',
      status: 'idle',
      durationMs: 0,
      logs: [],
    },
    test2: {
      id: 'test2',
      name: '2. A→B→A Category Switch Persistence',
      status: 'idle',
      durationMs: 0,
      logs: [],
    },
    test3: {
      id: 'test3',
      name: '3. Reload State & Restore Assets from Native IDB',
      status: 'idle',
      durationMs: 0,
      logs: [],
    },
    test4: {
      id: 'test4',
      name: '4. Intentional Clear Image Preservation during Resolve',
      status: 'idle',
      durationMs: 0,
      logs: [],
    },
    test5: {
      id: 'test5',
      name: '5. Edited Text Preservation with Untouched Image Resolve',
      status: 'idle',
      durationMs: 0,
      logs: [],
    },
    test6: {
      id: 'test6',
      name: '6. Delayed Outgoing Save Timer Settlement & Active Draft Ownership',
      status: 'idle',
      durationMs: 0,
      logs: [],
    },
  });

  // Canvas refs cho từng bài test
  const canvasRef1 = useRef<HTMLCanvasElement | null>(null);
  const canvasRef2 = useRef<HTMLCanvasElement | null>(null);
  const canvasRef3 = useRef<HTMLCanvasElement | null>(null);
  const canvasRef4 = useRef<HTMLCanvasElement | null>(null);
  const canvasRef5 = useRef<HTMLCanvasElement | null>(null);
  const canvasRef6 = useRef<HTMLCanvasElement | null>(null);

  const addLog = (msg: string) => {
    const time = new Date().toISOString().slice(11, 19);
    setConsoleLogs((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 99)]);
  };

  const updateIDBCount = async () => {
    const info = await inspectNativeIDB(QC_ASSET_DB);
    setIdbRecordCount(info.count);
    return info;
  };

  // Lifecycle check & xử lý actual reload verify khi mount
  useEffect(() => {
    (async () => {
      // 1. Tự sửa schema nếu QC_ASSET_DB trước đó bị poison
      try {
        const db = await openAssetDB(QC_ASSET_DB);
        db.close();
      } catch {}
      await updateIDBCount();

      // 2. Kiểm tra nếu vừa xảy ra actual browser reload từ bước 3
      if (typeof window !== 'undefined' && window.sessionStorage.getItem(QC_RELOAD_FLAG) === 'true') {
        window.sessionStorage.removeItem(QC_RELOAD_FLAG);
        setActualReloadDetected(true);
        addLog('Phát hiện trình duyệt vừa F5 Reload thật! Bắt đầu kiểm tra dữ liệu QC có sẵn (KHÔNG reseed)...');
        await verifyExistingQCDataAfterActualReload();
      }
    })();
  }, []);

  // Xử lý kiểm tra dữ liệu QC có sẵn sau khi Actual F5 Reload
  const verifyExistingQCDataAfterActualReload = async () => {
    const t0 = performance.now();
    const logs: string[] = [];
    logs.push('=== BẮT ĐẦU XÁC MINH SAU KHI ACTUAL BROWSER RELOAD (F5 THẬT) ===');

    try {
      const rawMain = window.localStorage.getItem(QC_STORAGE_KEY);
      if (!rawMain) throw new Error(`Không tìm thấy dữ liệu có sẵn tại storage key [${QC_STORAGE_KEY}]!`);
      const parsedMain = JSON.parse(rawMain);
      logs.push(`Đọc dữ liệu có sẵn từ localStorage: category=${parsedMain.categoryId}, name=${parsedMain.name}`);

      // Kiểm tra native IDB có chứa assets của draft này không
      const idbInfo = await inspectNativeIDB(QC_ASSET_DB);
      logs.push(`Native IndexedDB có ${idbInfo.count} records. Keys: ${idbInfo.keys.join(', ')}`);
      if (idbInfo.count === 0) throw new Error('Native IndexedDB rỗng sau reload!');

      // Khởi tạo controller và load draft
      const controller = new DraftController({
        storage: window.localStorage,
        storageKey: QC_STORAGE_KEY,
        draftKey: QC_DRAFT_KEY,
        assetOptions: { dbName: QC_ASSET_DB },
        initialState: createTestState({
          industry: 'recruitment',
          categoryId: 'recruitment',
          name: 'Empty State Before Load',
        }),
        onStateChange: () => {},
      });

      logs.push('Gọi controller.loadInitialDraft() nạp dữ liệu có sẵn...');
      await controller.loadInitialDraft();
      const restored = controller.getState();

      if (restored.categoryId !== parsedMain.categoryId) {
        throw new Error(`Category khôi phục không đúng: mong đợi ${parsedMain.categoryId}, nhận được ${restored.categoryId}`);
      }
      if (!restored.image || !restored.image.startsWith('data:image/')) {
        throw new Error('Ảnh chính không giải mã được thành data URI từ native IndexedDB!');
      }

      logs.push('XÁC MINH THÀNH CÔNG: Dữ liệu QC có sẵn được khôi phục 100% từ storage và native IndexedDB sau reload thật!');

      if (canvasRef3.current) {
        await renderStateToCanvas(canvasRef3.current, restored);
        logs.push('Đã render canvas thật của Test 3 sau actual reload.');
      }

      const durationMs = Math.round(performance.now() - t0);
      setTestResults((prev) => ({
        ...prev,
        test3: {
          ...prev.test3,
          status: 'pass',
          durationMs,
          logs,
          idbKeys: idbInfo.keys,
          stateDump: { category: restored.categoryId, name: restored.name, actualReloadVerified: true },
        },
      }));
    } catch (err: any) {
      logs.push(`LỖI XÁC MINH RELOAD: ${err.message}`);
      setTestResults((prev) => ({
        ...prev,
        test3: { ...prev.test3, status: 'fail', durationMs: Math.round(performance.now() - t0), logs, error: err.message },
      }));
    }
  };

  // TEST 1: Native IndexedDB Persist & Resolve Roundtrip
  const runTest1 = async (): Promise<boolean> => {
    const t0 = performance.now();
    const logs: string[] = [];
    logs.push('Khởi động Test 1: Kiểm tra native IndexedDB persist & resolve...');

    try {
      const mainFixture = createMainFixture('TEST 1 MAIN', '#0f766e', '#ffffff');
      const bgFixture = createBgFixture('TEST 1 BACKGROUND', '#1e293b', '#0f172a');

      const initialState = createTestState({
        industry: 'recruitment',
        categoryId: 'recruitment',
        name: 'Senior Systems Architect',
        details: 'Native IDB roundtrip verification',
        image: mainFixture,
        backgroundImage: bgFixture,
      });

      logs.push(`State ban đầu: image len=${mainFixture.length}, bg len=${bgFixture.length}`);

      // 1. Gọi persistStateAssets KHÔNG truyền mock driver -> chạy native IndexedDB
      const { state: persisted, failedFields } = await persistStateAssets(initialState, { dbName: QC_ASSET_DB });
      if (failedFields.length > 0) {
        throw new Error(`Persist thất bại! Các trường bị lỗi: ${failedFields.join(', ')}`);
      }

      if (!persisted.image || !persisted.image.startsWith('mivy-asset:')) {
        throw new Error(`image không thành asset ref hợp lệ (dính fallback): ${persisted.image?.slice(0, 30)}`);
      }
      if (!persisted.backgroundImage || !persisted.backgroundImage.startsWith('mivy-asset:')) {
        throw new Error(`backgroundImage không thành asset ref hợp lệ (dính fallback): ${persisted.backgroundImage?.slice(0, 30)}`);
      }
      logs.push(`Persist thành công: image ref=${persisted.image}, bg ref=${persisted.backgroundImage}`);

      // 2. Mở trực tiếp native IDB kiểm tra record thật
      const idbInfo = await inspectNativeIDB(QC_ASSET_DB);
      logs.push(`Native IndexedDB [${QC_ASSET_DB}] hiện có ${idbInfo.count} records. Keys: ${idbInfo.keys.join(', ')}`);
      if (!idbInfo.keys.includes(persisted.image)) {
        throw new Error(`Key ${persisted.image} KHÔNG tồn tại trong native IDB object store!`);
      }
      if (!idbInfo.keys.includes(persisted.backgroundImage)) {
        throw new Error(`Key ${persisted.backgroundImage} KHÔNG tồn tại trong native IDB object store!`);
      }

      // 3. Resolve lại state từ native IDB
      const resolved = await resolveStateAssets(persisted, { dbName: QC_ASSET_DB });
      if (resolved.image !== mainFixture) {
        throw new Error('Data URI của image sau khi giải mã không khớp 100% bản gốc!');
      }
      if (resolved.backgroundImage !== bgFixture) {
        throw new Error('Data URI của backgroundImage sau khi giải mã không khớp 100% bản gốc!');
      }
      logs.push('Resolve thành công: Cả main và background khớp 100% từng byte dữ liệu gốc từ native IDB!');

      // 4. Render lên canvas thật
      if (canvasRef1.current) {
        await renderStateToCanvas(canvasRef1.current, resolved);
        logs.push('Đã render poster thật lên canvas từ restored state.');
      }

      const durationMs = Math.round(performance.now() - t0);
      setTestResults((prev) => ({
        ...prev,
        test1: { ...prev.test1, status: 'pass', durationMs, logs, idbKeys: idbInfo.keys, stateDump: { imageRef: persisted.image, bgRef: persisted.backgroundImage } },
      }));
      return true;
    } catch (err: any) {
      logs.push(`LỖI: ${err.message}`);
      setTestResults((prev) => ({
        ...prev,
        test1: { ...prev.test1, status: 'fail', durationMs: Math.round(performance.now() - t0), logs, error: err.message },
      }));
      return false;
    }
  };

  // TEST 2: A→B→A Category Switch Persistence
  const runTest2 = async (): Promise<boolean> => {
    const t0 = performance.now();
    const logs: string[] = [];
    logs.push('Khởi động Test 2: Chuyển đổi ngành A→B→A trên DraftController production...');

    try {
      const mainA = createMainFixture('RECRUITMENT A', '#1e40af', '#ffffff');
      const controller = new DraftController({
        storage: window.localStorage,
        storageKey: QC_STORAGE_KEY,
        draftKey: QC_DRAFT_KEY,
        assetOptions: { dbName: QC_ASSET_DB },
        initialState: createTestState({
          industry: 'recruitment',
          categoryId: 'recruitment',
          name: 'Lead Cloud Engineer A',
          image: mainA,
        }),
        onStateChange: () => {},
      });

      // 1. Chuyển sang property (B)
      logs.push('Chuyển từ recruitment sang property...');
      await controller.changeCategory('property');
      if (controller.getState().categoryId !== 'property') throw new Error('Chưa chuyển sang property');

      // Chống False Positive: Xác minh ngành cũ recruitment ĐÃ THỰC SỰ LƯU ASSET REF VÀO NATIVE IDB
      const draftsMap = JSON.parse(window.localStorage.getItem(QC_DRAFT_KEY) || '{}');
      const savedA = draftsMap['recruitment'] || controller.inMemoryDrafts['recruitment'];
      if (!savedA || !savedA.image?.startsWith('mivy-asset:')) {
        throw new Error(`Ngành cũ recruitment chưa được persist thành asset ref trong IDB! Image: ${savedA?.image?.slice(0, 30)}`);
      }
      const idbCheck = await inspectNativeIDB(QC_ASSET_DB);
      if (!idbCheck.keys.includes(savedA.image)) {
        throw new Error(`Asset ref của ngành A (${savedA.image}) không có trong native IDB! Dính lỗi false positive.`);
      }
      logs.push(`Xác minh: Ngành A đã persist thành công ref ${savedA.image} vào native IDB!`);

      // Chỉnh sửa tiêu đề ở property
      controller.saveState({
        ...controller.getState(),
        name: 'Sky Villa Penthouse B',
      }, 30);
      await new Promise((r) => setTimeout(r, 60));
      logs.push('Đã chuyển sang property và lưu tiêu đề: Sky Villa Penthouse B');

      // 2. Chuyển quay lại recruitment (A)
      logs.push('Chuyển ngược lại recruitment...');
      await controller.changeCategory('recruitment');
      const restoredA = controller.getState();

      if (restoredA.categoryId !== 'recruitment') throw new Error('Không chuyển được về recruitment');
      if (restoredA.name !== 'Lead Cloud Engineer A') throw new Error(`Tên không khớp: ${restoredA.name}`);
      if (restoredA.image !== mainA) throw new Error('Ảnh của ngành A không được khôi phục thành data URI gốc!');

      logs.push('Thành công: Ngành A phục hồi 100% tiêu đề và ảnh chính từ native IDB/drafts!');

      if (canvasRef2.current) {
        await renderStateToCanvas(canvasRef2.current, restoredA);
        logs.push('Đã render canvas thật của ngành A sau phục hồi.');
      }

      const idbInfo = await updateIDBCount();
      const durationMs = Math.round(performance.now() - t0);
      setTestResults((prev) => ({
        ...prev,
        test2: { ...prev.test2, status: 'pass', durationMs, logs, idbKeys: idbInfo.keys, stateDump: { restoredCategory: restoredA.categoryId, restoredName: restoredA.name } },
      }));
      return true;
    } catch (err: any) {
      logs.push(`LỖI: ${err.message}`);
      setTestResults((prev) => ({
        ...prev,
        test2: { ...prev.test2, status: 'fail', durationMs: Math.round(performance.now() - t0), logs, error: err.message },
      }));
      return false;
    }
  };

  // TEST 3: Chuẩn bị dữ liệu cho reload và thực thi mô phỏng controller mới
  const runTest3 = async (): Promise<boolean> => {
    const t0 = performance.now();
    const logs: string[] = [];
    logs.push('Khởi động Test 3: Chuẩn bị state & nạp lại từ localStorage + native IDB...');

    try {
      const mainReload = createMainFixture('RELOAD FIXTURE', '#b91c1c', '#ffffff');
      const bgReload = createBgFixture('RELOAD BACKGROUND', '#450a0a', '#18181b');

      // 1. Persist trực tiếp ảnh vào native IDB
      const { state: pState, failedFields } = await persistStateAssets(
        createTestState({
          industry: 'general',
          categoryId: 'food',
          conceptId: 'food-hero',
          name: 'Signature Wagyu Steak Set',
          image: mainReload,
          backgroundImage: bgReload,
        }),
        { dbName: QC_ASSET_DB }
      );
      if (failedFields.length > 0) throw new Error(`Lưu assets thất bại: ${failedFields.join(', ')}`);
      if (!pState.image?.startsWith('mivy-asset:') || !pState.backgroundImage?.startsWith('mivy-asset:')) {
        throw new Error('Assets chưa chuyển thành ref hợp lệ!');
      }

      // 2. Lưu vào QC storage key để sẵn sàng cho F5 reload
      window.localStorage.setItem(QC_STORAGE_KEY, JSON.stringify(pState));
      const drafts = JSON.parse(window.localStorage.getItem(QC_DRAFT_KEY) || '{}');
      drafts['food'] = pState;
      window.localStorage.setItem(QC_DRAFT_KEY, JSON.stringify(drafts));
      logs.push('Đã ghi bản nháp ngành food có refs vào [mivy-qc-marketing-v1] và native IDB.');

      // 3. Khởi tạo controller mới toanh đọc dữ liệu vừa lưu
      const reloadedController = new DraftController({
        storage: window.localStorage,
        storageKey: QC_STORAGE_KEY,
        draftKey: QC_DRAFT_KEY,
        assetOptions: { dbName: QC_ASSET_DB },
        initialState: createTestState({
          industry: 'recruitment',
          categoryId: 'recruitment',
          name: 'Empty Initial',
        }),
        onStateChange: () => {},
      });

      logs.push('Gọi reloadedController.loadInitialDraft()...');
      await reloadedController.loadInitialDraft();
      const finalRestored = reloadedController.getState();

      if (finalRestored.categoryId !== 'food') throw new Error(`Category khôi phục không đúng: ${finalRestored.categoryId}`);
      if (finalRestored.name !== 'Signature Wagyu Steak Set') throw new Error(`Name khôi phục không đúng: ${finalRestored.name}`);
      if (finalRestored.image !== mainReload) throw new Error('Ảnh chính không giải mã được thành data URI sau khi reload!');
      if (finalRestored.backgroundImage !== bgReload) throw new Error('Ảnh nền không giải mã được thành data URI sau khi reload!');

      logs.push('Thành công: Nạp metadata tức thì và giải mã 100% data URI từ native IndexedDB!');

      if (canvasRef3.current) {
        await renderStateToCanvas(canvasRef3.current, finalRestored);
        logs.push('Đã render poster thật từ state sau reload.');
      }

      const idbInfo = await updateIDBCount();
      const durationMs = Math.round(performance.now() - t0);
      setTestResults((prev) => ({
        ...prev,
        test3: { ...prev.test3, status: 'pass', durationMs, logs, idbKeys: idbInfo.keys, stateDump: { category: finalRestored.categoryId, name: finalRestored.name } },
      }));
      return true;
    } catch (err: any) {
      logs.push(`LỖI: ${err.message}`);
      setTestResults((prev) => ({
        ...prev,
        test3: { ...prev.test3, status: 'fail', durationMs: Math.round(performance.now() - t0), logs, error: err.message },
      }));
      return false;
    }
  };

  // TEST 4: Intentional Clear Image Preservation during Resolve
  const runTest4 = async (): Promise<boolean> => {
    const t0 = performance.now();
    const logs: string[] = [];
    logs.push('Khởi động Test 4: Chủ động gỡ ảnh trong lúc resolve không bị hồi sinh...');

    try {
      const mainProp = createMainFixture('PROPERTY MAIN', '#047857', '#ffffff');
      const bgProp = createBgFixture('PROPERTY BG TO CLEAR', '#064e3b', '#022c22');

      // Persist trước 2 ảnh vào native IDB
      const { state: pState, failedFields } = await persistStateAssets(
        createTestState({
          industry: 'service',
          categoryId: 'property',
          name: 'Villa with Garden',
          image: mainProp,
          backgroundImage: bgProp,
        }),
        { dbName: QC_ASSET_DB }
      );
      if (failedFields.length > 0) throw new Error(`Lưu assets thất bại: ${failedFields.join(', ')}`);
      if (!pState.image?.startsWith('mivy-asset:') || !pState.backgroundImage?.startsWith('mivy-asset:')) {
        throw new Error('Assets chưa chuyển thành ref thật!');
      }

      // Lưu draft của property
      const currentDrafts = JSON.parse(window.localStorage.getItem(QC_DRAFT_KEY) || '{}');
      currentDrafts['property'] = pState;
      window.localStorage.setItem(QC_DRAFT_KEY, JSON.stringify(currentDrafts));

      const controller = new DraftController({
        storage: window.localStorage,
        storageKey: QC_STORAGE_KEY,
        draftKey: QC_DRAFT_KEY,
        assetOptions: { dbName: QC_ASSET_DB },
        initialState: createTestState({
          industry: 'recruitment',
          categoryId: 'recruitment',
          name: 'Active Recruitment',
        }),
        onStateChange: () => {},
      });

      // Bắt đầu switch sang property
      const switchP = controller.changeCategory('property');

      // Trong lúc resolve đang chạy, người dùng gỡ ảnh nền: backgroundImage = ''
      await new Promise((r) => setTimeout(r, 5));
      controller.saveState({
        ...controller.getState(),
        backgroundImage: '', // Intentional clear!
      }, 20);

      await switchP;
      await new Promise((r) => setTimeout(r, 80));

      const finalState = controller.getState();
      if (finalState.categoryId !== 'property') throw new Error('Chưa chuyển sang property');
      if (finalState.backgroundImage !== '') throw new Error(`Ảnh nền bị hồi sinh: ${finalState.backgroundImage}`);
      if (finalState.image !== mainProp) throw new Error('Ảnh chính còn lại không được giải mã thành data URI!');

      logs.push('Thành công: Thao tác gỡ ảnh nền được bảo toàn (không hồi sinh), ảnh chính giải mã thành công!');

      if (canvasRef4.current) {
        await renderStateToCanvas(canvasRef4.current, finalState);
        logs.push('Đã render canvas thật kiểm tra không có background image.');
      }

      const idbInfo = await updateIDBCount();
      const durationMs = Math.round(performance.now() - t0);
      setTestResults((prev) => ({
        ...prev,
        test4: { ...prev.test4, status: 'pass', durationMs, logs, idbKeys: idbInfo.keys, stateDump: { bg: finalState.backgroundImage, mainLen: finalState.image?.length } },
      }));
      return true;
    } catch (err: any) {
      logs.push(`LỖI: ${err.message}`);
      setTestResults((prev) => ({
        ...prev,
        test4: { ...prev.test4, status: 'fail', durationMs: Math.round(performance.now() - t0), logs, error: err.message },
      }));
      return false;
    }
  };

  // TEST 5: Edited Text Preservation with Untouched Image Resolve
  const runTest5 = async (): Promise<boolean> => {
    const t0 = performance.now();
    const logs: string[] = [];
    logs.push('Khởi động Test 5: Gõ text trong lúc target resolve không làm mất text và resolve ảnh còn lại...');

    try {
      const avatarMain = createMainFixture('DEV HERO AVATAR', '#4338ca', '#ffffff');

      // Persist ảnh vào native IDB
      const { state: pState, failedFields } = await persistStateAssets(
        createTestState({
          industry: 'recruitment',
          categoryId: 'recruitment',
          name: 'Initial Headline',
          image: avatarMain,
        }),
        { dbName: QC_ASSET_DB }
      );
      if (failedFields.length > 0) throw new Error(`Lưu assets thất bại: ${failedFields.join(', ')}`);
      if (!pState.image?.startsWith('mivy-asset:')) throw new Error('Ảnh chưa chuyển thành asset ref!');

      const currentDrafts = JSON.parse(window.localStorage.getItem(QC_DRAFT_KEY) || '{}');
      currentDrafts['recruitment'] = pState;
      window.localStorage.setItem(QC_DRAFT_KEY, JSON.stringify(currentDrafts));

      const controller = new DraftController({
        storage: window.localStorage,
        storageKey: QC_STORAGE_KEY,
        draftKey: QC_DRAFT_KEY,
        assetOptions: { dbName: QC_ASSET_DB },
        initialState: createTestState({
          industry: 'service',
          categoryId: 'property',
          name: 'Property State',
        }),
        onStateChange: () => {},
      });

      // Switch sang recruitment
      const switchP = controller.changeCategory('recruitment');

      // Trong lúc resolve, người dùng gõ tiêu đề mới
      await new Promise((r) => setTimeout(r, 5));
      controller.saveState({
        ...controller.getState(),
        name: 'Realtime Edited Headline by User',
      }, 20);

      await switchP;
      await new Promise((r) => setTimeout(r, 80));

      const finalState = controller.getState();
      if (finalState.name !== 'Realtime Edited Headline by User') throw new Error(`Text bị mất/đè: ${finalState.name}`);
      if (finalState.image !== avatarMain) throw new Error('Ảnh untouched không được giải mã thành data URI!');

      logs.push('Thành công: Tiêu đề gõ mới được giữ 100%, ảnh chính untouched giải mã thành công!');

      if (canvasRef5.current) {
        await renderStateToCanvas(canvasRef5.current, finalState);
        logs.push('Đã render canvas thật hiển thị tiêu đề gõ mới cùng ảnh chính.');
      }

      const idbInfo = await updateIDBCount();
      const durationMs = Math.round(performance.now() - t0);
      setTestResults((prev) => ({
        ...prev,
        test5: { ...prev.test5, status: 'pass', durationMs, logs, idbKeys: idbInfo.keys, stateDump: { name: finalState.name, imageLen: finalState.image?.length } },
      }));
      return true;
    } catch (err: any) {
      logs.push(`LỖI: ${err.message}`);
      setTestResults((prev) => ({
        ...prev,
        test5: { ...prev.test5, status: 'fail', durationMs: Math.round(performance.now() - t0), logs, error: err.message },
      }));
      return false;
    }
  };

  // TEST 6: Delayed Outgoing Save Timer Settlement & Active Draft Ownership
  const runTest6 = async (): Promise<boolean> => {
    const t0 = performance.now();
    const logs: string[] = [];
    logs.push('Khởi động Test 6: Delayed outgoing save timer settle không ghi đè active draft B...');

    try {
      const propLogo = createMainFixture('PROPERTY TARGET LOGO', '#c2410c', '#ffffff');

      // Chuẩn bị draft property
      const currentDrafts = JSON.parse(window.localStorage.getItem(QC_DRAFT_KEY) || '{}');
      currentDrafts['property'] = createTestState({
        categoryId: 'property',
        industry: 'service',
        name: 'Eco Green City B',
        image: propLogo,
      });
      window.localStorage.setItem(QC_DRAFT_KEY, JSON.stringify(currentDrafts));

      const controller = new DraftController({
        storage: window.localStorage,
        storageKey: QC_STORAGE_KEY,
        draftKey: QC_DRAFT_KEY,
        assetOptions: { dbName: QC_ASSET_DB },
        initialState: createTestState({
          industry: 'recruitment',
          categoryId: 'recruitment',
          name: 'Before Outgoing Edit',
        }),
        onStateChange: () => {},
      });

      // 1. Bắt đầu switch sang property với persist delay 50ms
      logs.push('Bắt đầu chuyển ngành sang property (delay 50ms)...');
      const switchPromise = controller.changeCategory('property', 50);

      // 2. Sau 15ms (trong lúc outgoing persist đang await), user gọi saveState delay 100ms
      await new Promise((r) => setTimeout(r, 15));
      controller.saveState({
        ...controller.getState(),
        name: 'Late Outgoing Edit Name',
      }, 100);
      logs.push('Đã kích hoạt saveState("Late Outgoing Edit Name", delay 100ms) trong lúc outgoing persist await.');

      // 3. Đợi switch sang property hoàn tất
      await switchPromise;
      logs.push('Switch sang property đã hoàn tất. Đang chờ 150ms để timer 100ms settle trong lúc B active...');

      // 4. QUAN TRỌNG: Đợi 150ms để save timer (100ms) settle hoàn toàn trong lúc B đang active!
      await new Promise((r) => setTimeout(r, 150));

      // Kiểm tra: active category trong controller là property
      const currentProp = controller.getState();
      if (currentProp.categoryId !== 'property') throw new Error(`Category UI bị sai: ${currentProp.categoryId}`);

      // Kiểm tra theo evidence reports/outgoing-save-review-20261008.json:
      // Main storage key [mivy-qc-marketing-v1] PHẢI LÀ property!
      const mainRaw = window.localStorage.getItem(QC_STORAGE_KEY);
      const parsedMain = mainRaw ? JSON.parse(mainRaw) : null;
      if (!parsedMain || parsedMain.categoryId !== 'property') {
        throw new Error(`Main storage bị recruitment đè bẹp! Category hiện tại: ${parsedMain?.categoryId}`);
      }
      logs.push('Kiểm tra chính xác: Main storage key [mivy-qc-marketing-v1] duy trì đúng "property"!');

      // 5. Chuyển quay lại recruitment
      logs.push('Chuyển quay lại recruitment...');
      await controller.changeCategory('recruitment');
      const restoredRecruit = controller.getState();
      if (restoredRecruit.categoryId !== 'recruitment') throw new Error('Không chuyển về được recruitment');
      if (restoredRecruit.name !== 'Late Outgoing Edit Name') {
        throw new Error(`Bản edit ngành cũ bị mất: ${restoredRecruit.name}`);
      }
      logs.push('Thành công: Bản edit ngành cũ "Late Outgoing Edit Name" được bảo toàn 100%!');

      if (canvasRef6.current) {
        await renderStateToCanvas(canvasRef6.current, currentProp);
        logs.push('Đã render canvas thật của ngành property (B).');
      }

      const idbInfo = await updateIDBCount();
      const durationMs = Math.round(performance.now() - t0);
      setTestResults((prev) => ({
        ...prev,
        test6: { ...prev.test6, status: 'pass', durationMs, logs, idbKeys: idbInfo.keys, stateDump: { storageCategory: parsedMain.categoryId, restoredName: restoredRecruit.name } },
      }));
      return true;
    } catch (err: any) {
      logs.push(`LỖI: ${err.message}`);
      setTestResults((prev) => ({
        ...prev,
        test6: { ...prev.test6, status: 'fail', durationMs: Math.round(performance.now() - t0), logs, error: err.message },
      }));
      return false;
    }
  };

  // Chạy toàn bộ 6 tests tự động
  const handleRunAll = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setConsoleLogs([]);
    addLog('BẮT ĐẦU CHẠY TOÀN BỘ 6 TESTS QC TRÌNH DUYỆT THẬT (NATIVE IDB)...');

    // Reset status
    setTestResults((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        next[k] = { ...next[k], status: 'running', logs: [] };
      });
      return next;
    });

    try {
      setActiveStep('Test 1');
      addLog('Đang chạy Test 1: Native IndexedDB Persist & Resolve...');
      const ok1 = await runTest1();

      setActiveStep('Test 2');
      addLog('Đang chạy Test 2: A→B→A Switch Persistence...');
      const ok2 = await runTest2();

      setActiveStep('Test 3');
      addLog('Đang chạy Test 3: Reload State from Native IDB...');
      const ok3 = await runTest3();

      setActiveStep('Test 4');
      addLog('Đang chạy Test 4: Intentional Clear during Resolve...');
      const ok4 = await runTest4();

      setActiveStep('Test 5');
      addLog('Đang chạy Test 5: Edited Text during Resolve...');
      const ok5 = await runTest5();

      setActiveStep('Test 6');
      addLog('Đang chạy Test 6: Delayed Outgoing Save Settlement...');
      const ok6 = await runTest6();

      const allOk = ok1 && ok2 && ok3 && ok4 && ok5 && ok6;
      addLog(allOk ? 'HOÀN TẤT: 6/6 NATIVE BROWSER QC TESTS ĐÃ PASS 100%!' : 'CÓ TEST THẤT BẠI.');
    } finally {
      setIsRunning(false);
      setActiveStep('');
      await updateIDBCount();
    }
  };

  // Nút kích hoạt Actual F5 Reload
  const handleTriggerActualReload = async () => {
    addLog('Chuẩn bị state và đặt flag cho Actual Browser F5 Reload...');
    await runTest3();
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(QC_RELOAD_FLAG, 'true');
      addLog('Đang thực hiện window.location.reload()...');
      setTimeout(() => {
        window.location.reload();
      }, 300);
    }
  };

  // Dọn dẹp QC namespace
  const handleCleanup = async () => {
    await cleanupQCNamespace();
    await updateIDBCount();
    addLog('Đã dọn dẹp sạch sẽ namespace [mivy-qc-*]. Bản nháp thật không bị ảnh hưởng.');
  };

  // Tải báo cáo JSON
  const handleDownloadJSON = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      nativeIndexedDBAvailable: typeof window !== 'undefined' && Boolean(window.indexedDB),
      namespace: {
        storageKey: QC_STORAGE_KEY,
        draftKey: QC_DRAFT_KEY,
        dbName: QC_ASSET_DB,
      },
      currentIDBRecordCount: idbRecordCount,
      actualReloadVerified: actualReloadDetected,
      summary: {
        total: Object.keys(testResults).length,
        passed: Object.values(testResults).filter((t) => t.status === 'pass').length,
        failed: Object.values(testResults).filter((t) => t.status === 'fail').length,
      },
      tests: testResults,
      consoleLogs,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mivy-browser-qc-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    addLog('Đã tải xuống file báo cáo mivy-browser-qc-report.json');
  };

  // Tải toàn bộ canvas PNG
  const handleDownloadAllPNGs = () => {
    downloadCanvasPNG(canvasRef1.current, 'qc-canvas-test1-roundtrip.png');
    downloadCanvasPNG(canvasRef2.current, 'qc-canvas-test2-aba-switch.png');
    downloadCanvasPNG(canvasRef3.current, 'qc-canvas-test3-reload-restore.png');
    downloadCanvasPNG(canvasRef4.current, 'qc-canvas-test4-clear-image.png');
    downloadCanvasPNG(canvasRef5.current, 'qc-canvas-test5-edited-text.png');
    downloadCanvasPNG(canvasRef6.current, 'qc-canvas-test6-delayed-save.png');
    addLog('Đã kích hoạt tải 6 file PNG cho toàn bộ test canvases.');
  };

  const passCount = Object.values(testResults).filter((t) => t.status === 'pass').length;
  const failCount = Object.values(testResults).filter((t) => t.status === 'fail').length;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Link href="/studio/marketing/review" className="text-white hover:text-zinc-300 text-sm font-medium">
                ← So sánh Concept
              </Link>
              <span className="text-slate-600">|</span>
              <Link href="/studio/marketing" className="text-slate-400 hover:text-slate-300 text-sm font-medium">
                Studio Marketing
              </Link>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              Native IndexedDB Browser QC Harness
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/20 text-zinc-300 border border-white/30">
                Enforced Dev-Only
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Kiểm thử runtime thực tế với <code className="text-zinc-300">window.indexedDB</code> và production <code className="text-zinc-300">DraftController</code>.
              Namespace cô lập hoàn toàn: <code className="text-amber-300">{QC_STORAGE_KEY}</code>, <code className="text-amber-300">{QC_ASSET_DB}</code>. Tuyệt đối không đụng draft thật.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isRunning}
              onClick={handleRunAll}
              className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition ${
                isRunning
                  ? 'bg-zinc-400/50 text-zinc-200 cursor-not-allowed animate-pulse'
                  : 'bg-zinc-400 hover:bg-indigo-400 text-white shadow-lg shadow-emerald-900/30'
              }`}
            >
              {isRunning ? `Đang chạy (${activeStep})...` : '▶ Chạy Tất Cả (Run All QC)'}
            </button>
            <button
              type="button"
              disabled={isRunning}
              onClick={handleTriggerActualReload}
              className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium shadow-md shadow-amber-950/40 transition flex items-center gap-1.5"
              title="Kích hoạt F5 Reload thật và verify dữ liệu không reseed"
            >
              🔄 Chạy Actual F5 Reload Thật
            </button>
            <button
              type="button"
              onClick={handleDownloadAllPNGs}
              className="px-3 py-2 rounded-lg bg-indigo-900/60 hover:bg-indigo-800/60 text-indigo-200 text-sm font-medium border border-indigo-700/50 transition"
              title="Tải tất cả ảnh Canvas PNG để kiểm tra hình ảnh"
            >
              🖼 Tải Toàn Bộ PNGs
            </button>
            <button
              type="button"
              onClick={handleDownloadJSON}
              className="px-3 py-2 rounded-lg bg-sky-900/50 hover:bg-sky-800/50 text-sky-200 text-sm font-medium border border-sky-700/50 transition"
            >
              ⬇ Tải JSON Báo Cáo
            </button>
            <button
              type="button"
              disabled={isRunning}
              onClick={handleCleanup}
              className="px-3 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-sm font-medium border border-rose-800/40 transition"
            >
              🗑 Dọn Dẹp QC Storage
            </button>
          </div>
        </div>

        {/* Metrics Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="text-xs text-slate-400 font-medium">Tổng số Test Cases</div>
            <div className="text-2xl font-bold text-white mt-1">6 Cases</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="text-xs text-slate-400 font-medium">Kết Quả Hiện Tại</div>
            <div className="text-2xl font-bold mt-1 flex items-center gap-2">
              <span className="text-white">{passCount} PASS</span>
              {failCount > 0 && <span className="text-rose-400">/ {failCount} FAIL</span>}
            </div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="text-xs text-slate-400 font-medium">Records trong Native IDB</div>
            <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">{idbRecordCount} Assets</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="text-xs text-slate-400 font-medium">Actual F5 Reload Status</div>
            <div className="text-sm font-bold mt-2 flex items-center gap-2">
              {actualReloadDetected ? (
                <span className="text-white flex items-center gap-1.5 font-mono">
                  ✓ F5 Verified (No Reseed)
                </span>
              ) : (
                <span className="text-slate-400 font-mono text-xs">Chưa bấm F5 Reload</span>
              )}
            </div>
          </div>
        </div>

        {/* 6 Test Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1 */}
          <article className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 font-semibold">TEST 1</span>
                <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                  testResults.test1.status === 'pass' ? 'bg-white/20 text-white border border-white/30' :
                  testResults.test1.status === 'fail' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                  testResults.test1.status === 'running' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  {testResults.test1.status.toUpperCase()}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-white mt-1">Native IDB Persist & Resolve</h2>
              <p className="text-xs text-slate-400 mt-1">Lưu main/bg data URI vào IDB thật, xác minh key và giải mã khớp 100% byte.</p>
            </div>
            <div className="aspect-[4/5] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 relative">
              <canvas ref={canvasRef1} className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="text-xs font-mono text-slate-500">
                <span>{testResults.test1.durationMs}ms · launch</span>
              </div>
              <button
                type="button"
                onClick={() => downloadCanvasPNG(canvasRef1.current, 'qc-canvas-test1-roundtrip.png')}
                className="text-xs text-white hover:text-zinc-300 font-medium"
              >
                ⬇ Tải PNG
              </button>
            </div>
          </article>

          {/* Card 2 */}
          <article className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 font-semibold">TEST 2</span>
                <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                  testResults.test2.status === 'pass' ? 'bg-white/20 text-white border border-white/30' :
                  testResults.test2.status === 'fail' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                  testResults.test2.status === 'running' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  {testResults.test2.status.toUpperCase()}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-white mt-1">A→B→A Switch Persistence</h2>
              <p className="text-xs text-slate-400 mt-1">Chuyển recruitment sang property, sửa B, quay lại A khôi phục đủ ảnh và text.</p>
            </div>
            <div className="aspect-[4/5] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 relative">
              <canvas ref={canvasRef2} className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="text-xs font-mono text-slate-500">
                <span>{testResults.test2.durationMs}ms · recruitment</span>
              </div>
              <button
                type="button"
                onClick={() => downloadCanvasPNG(canvasRef2.current, 'qc-canvas-test2-aba-switch.png')}
                className="text-xs text-white hover:text-zinc-300 font-medium"
              >
                ⬇ Tải PNG
              </button>
            </div>
          </article>

          {/* Card 3 */}
          <article className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 font-semibold">TEST 3</span>
                <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                  testResults.test3.status === 'pass' ? 'bg-white/20 text-white border border-white/30' :
                  testResults.test3.status === 'fail' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                  testResults.test3.status === 'running' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  {testResults.test3.status.toUpperCase()}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-white mt-1">Browser Reload State & IDB Restore</h2>
              <p className="text-xs text-slate-400 mt-1">Nạp dữ liệu có sẵn từ storage, giải mã data URI từ native IDB (F5 thật).</p>
            </div>
            <div className="aspect-[4/5] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 relative">
              <canvas ref={canvasRef3} className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="text-xs font-mono text-slate-500">
                <span>{testResults.test3.durationMs}ms · food</span>
              </div>
              <button
                type="button"
                onClick={() => downloadCanvasPNG(canvasRef3.current, 'qc-canvas-test3-reload-restore.png')}
                className="text-xs text-white hover:text-zinc-300 font-medium"
              >
                ⬇ Tải PNG
              </button>
            </div>
          </article>

          {/* Card 4 */}
          <article className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 font-semibold">TEST 4</span>
                <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                  testResults.test4.status === 'pass' ? 'bg-white/20 text-white border border-white/30' :
                  testResults.test4.status === 'fail' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                  testResults.test4.status === 'running' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  {testResults.test4.status.toUpperCase()}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-white mt-1">Intentional Clear During Resolve</h2>
              <p className="text-xs text-slate-400 mt-1">Gỡ backgroundImage trong lúc resolve, đảm bảo không bị IDB hồi sinh đè lên.</p>
            </div>
            <div className="aspect-[4/5] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 relative">
              <canvas ref={canvasRef4} className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="text-xs font-mono text-slate-500">
                <span>{testResults.test4.durationMs}ms · property</span>
              </div>
              <button
                type="button"
                onClick={() => downloadCanvasPNG(canvasRef4.current, 'qc-canvas-test4-clear-image.png')}
                className="text-xs text-white hover:text-zinc-300 font-medium"
              >
                ⬇ Tải PNG
              </button>
            </div>
          </article>

          {/* Card 5 */}
          <article className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 font-semibold">TEST 5</span>
                <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                  testResults.test5.status === 'pass' ? 'bg-white/20 text-white border border-white/30' :
                  testResults.test5.status === 'fail' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                  testResults.test5.status === 'running' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  {testResults.test5.status.toUpperCase()}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-white mt-1">Edited Text During Resolve</h2>
              <p className="text-xs text-slate-400 mt-1">Sửa tiêu đề trong lúc resolve; tiêu đề mới được giữ và ảnh untouched resolve.</p>
            </div>
            <div className="aspect-[4/5] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 relative">
              <canvas ref={canvasRef5} className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="text-xs font-mono text-slate-500">
                <span>{testResults.test5.durationMs}ms · recruitment</span>
              </div>
              <button
                type="button"
                onClick={() => downloadCanvasPNG(canvasRef5.current, 'qc-canvas-test5-edited-text.png')}
                className="text-xs text-white hover:text-zinc-300 font-medium"
              >
                ⬇ Tải PNG
              </button>
            </div>
          </article>

          {/* Card 6 */}
          <article className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 font-semibold">TEST 6</span>
                <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                  testResults.test6.status === 'pass' ? 'bg-white/20 text-white border border-white/30' :
                  testResults.test6.status === 'fail' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                  testResults.test6.status === 'running' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  {testResults.test6.status.toUpperCase()}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-white mt-1">Delayed Save Settle & Ownership</h2>
              <p className="text-xs text-slate-400 mt-1">Timer 100ms của edit cũ settle trong lúc B active không thể đè storage B.</p>
            </div>
            <div className="aspect-[4/5] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 relative">
              <canvas ref={canvasRef6} className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="text-xs font-mono text-slate-500">
                <span>{testResults.test6.durationMs}ms · property</span>
              </div>
              <button
                type="button"
                onClick={() => downloadCanvasPNG(canvasRef6.current, 'qc-canvas-test6-delayed-save.png')}
                className="text-xs text-white hover:text-zinc-300 font-medium"
              >
                ⬇ Tải PNG
              </button>
            </div>
          </article>
        </div>

        {/* Console Logs Terminal */}
        <section className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
          <div className="bg-slate-900/80 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-slate-300">Assertion Logs Console</span>
            <span className="text-xs font-mono text-slate-500">{consoleLogs.length} messages</span>
          </div>
          <div className="p-3 font-mono text-xs text-slate-300 max-h-56 overflow-y-auto space-y-1">
            {consoleLogs.length === 0 ? (
              <div className="text-slate-600 italic">Chưa có log. Bấm &quot;Chạy Tất Cả&quot; để thực thi kiểm thử native IDB.</div>
            ) : (
              consoleLogs.map((log, idx) => (
                <div key={idx} className={log.includes('LỖI') ? 'text-rose-400 font-bold' : log.includes('HOÀN TẤT') || log.includes('XÁC MINH THÀNH CÔNG') ? 'text-white font-bold' : ''}>
                  {log}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
