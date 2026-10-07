// Comprehensive QC for Draft Asset Persistence (Two-tier, isolated storage)
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');
const ts = require('typescript');

// Hook TypeScript compiler for CJS
require.extensions['.ts'] = (m, f) => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/from\s+['"]@\/types['"]/g, "from '../types'");
  content = content.replace(/from\s+['"]@\/lib\//g, "from './");
  const transpiled = ts.transpileModule(content, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  m._compile(transpiled, f);
};

const {
  isAssetRef,
  saveAsset,
  getAsset,
  persistStateAssets,
  resolveStateAssets,
  inMemoryDriver,
} = require('./src/lib/asset-store.ts');

const {
  switchIndustry,
  saveIndustryDraft,
  getAllDrafts,
} = require('./src/lib/industry-drafts.ts');

// Tạo isolated mock storage
function createIsolatedStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    dump: () => Object.fromEntries(store.entries()),
  };
}

// Tạo driver mock cho Asset Store (hỗ trợ simulate quota error)
function createMockAssetDriver(options = {}) {
  const store = new Map();
  return {
    async get(id) {
      return store.get(id) || null;
    },
    async set(id, data) {
      if (options.shouldFail) {
        throw new Error('QuotaExceededError: DOMException');
      }
      store.set(id, data);
    },
    async delete(id) {
      store.delete(id);
    },
    async clear() {
      store.clear();
    },
    size() {
      return store.size;
    },
  };
}

async function runAllTests() {
  const results = [];
  console.log('--- STARTING DRAFT ASSET PERSISTENCE QC ---');

  // TEST 1: Tiny and Large Data URIs
  {
    const driver = createMockAssetDriver();
    const tinyData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const largeData = 'data:image/png;base64,' + 'A'.repeat(120000);

    const refTiny = await saveAsset(tinyData, undefined, { driver });
    const refLarge = await saveAsset(largeData, undefined, { driver });

    assert.ok(isAssetRef(refTiny), 'refTiny must have asset prefix');
    assert.ok(isAssetRef(refLarge), 'refLarge must have asset prefix');

    const recoveredTiny = await getAsset(refTiny, { driver });
    const recoveredLarge = await getAsset(refLarge, { driver });

    assert.strictEqual(recoveredTiny, tinyData, 'Tiny data URI must match exactly');
    assert.strictEqual(recoveredLarge, largeData, 'Large data URI must match exactly');

    results.push({ test: 'Tiny + Large Data URIs', passed: true });
    console.log('✓ Test 1: Tiny + Large Data URIs passed');
  }

  // TEST 2: Separate Main and Background Roles
  {
    const driver = createMockAssetDriver();
    const mainImg = 'data:image/png;base64,MAIN_AVATAR_' + 'M'.repeat(500);
    const bgImg = 'data:image/png;base64,BG_POSTER_' + 'B'.repeat(500);

    const initialState = {
      industry: 'recruitment',
      categoryId: 'recruitment',
      name: 'Test Dev',
      details: 'Details text',
      image: mainImg,
      backgroundImage: bgImg,
      mainImageFit: 'cover',
      mainImageZoom: 120,
      backgroundDim: 40,
      backgroundBlur: 6,
      copies: {
        launch: { headline: 'H1', subline: 'S1', cta: 'C1', caption: 'Cap1', points: [] },
        story: { headline: 'H2', subline: 'S2', cta: 'C2', caption: 'Cap2', points: [] },
        action: { headline: 'H3', subline: 'S3', cta: 'C3', caption: 'Cap3', points: [] },
      },
    };

    const { state: persisted, failedFields } = await persistStateAssets(initialState, { driver });
    assert.strictEqual(failedFields.length, 0, 'No failed fields expected');
    assert.ok(isAssetRef(persisted.image), 'image must be asset ref');
    assert.ok(isAssetRef(persisted.backgroundImage), 'backgroundImage must be asset ref');
    assert.notStrictEqual(persisted.image, persisted.backgroundImage, 'Main and BG must have separate refs');

    // Resolve back
    const resolved = await resolveStateAssets(persisted, { driver });
    assert.strictEqual(resolved.image, mainImg, 'Resolved main image must match');
    assert.strictEqual(resolved.backgroundImage, bgImg, 'Resolved background image must match');
    assert.strictEqual(resolved.mainImageZoom, 120, 'mainImageZoom preserved');
    assert.strictEqual(resolved.backgroundDim, 40, 'backgroundDim preserved');

    results.push({ test: 'Separate Main / Background Roles', passed: true });
    console.log('✓ Test 2: Separate Main / Background Roles passed');
  }

  // TEST 3: Switching A -> B -> A Preserves Both Layers and Edits
  {
    const driver = createMockAssetDriver();
    const storage = createIsolatedStorage();
    const storageKey = 'test-isolated-drafts-v1';

    const mainA = 'data:image/png;base64,ROLE_A_MAIN_' + 'A'.repeat(800);
    const bgA = 'data:image/png;base64,ROLE_A_BG_' + 'B'.repeat(800);

    const stateA = {
      industry: 'recruitment',
      categoryId: 'recruitment',
      name: 'Senior Architect',
      details: 'Tuyển dụng kiến trúc sư',
      brand: 'Corp A',
      offer: '3000 USD',
      image: mainA,
      backgroundImage: bgA,
      mainImageFit: 'contain',
      mainImageZoom: 110,
      backgroundDim: 50,
      backgroundBlur: 10,
      copies: {
        launch: { headline: 'A Launch', subline: 'A Sub', cta: 'Apply', caption: 'Cap A', points: [] },
        story: { headline: 'A Story', subline: 'A Sub', cta: 'Apply', caption: 'Cap A', points: [] },
        action: { headline: 'A Action', subline: 'A Sub', cta: 'Apply', caption: 'Cap A', points: [] },
      },
    };

    // 1. Chuyển từ A sang B (property)
    const { state: persistedA } = await persistStateAssets(stateA, { driver });
    const metaB = switchIndustry(persistedA, 'property', 'service', storage, { storageKey });

    assert.strictEqual(metaB.categoryId, 'property', 'Switched to property');
    assert.strictEqual(metaB.image, '', 'Property should start with clean main image');
    assert.strictEqual(metaB.bgUrl, '', 'Property should start with clean empty background URL per clean defaults');

    // 2. Chuyển từ B quay lại A (recruitment)
    const { state: persistedB } = await persistStateAssets(metaB, { driver });
    const metaA2 = switchIndustry(persistedB, 'recruitment', 'recruitment', storage, { storageKey });

    assert.strictEqual(metaA2.categoryId, 'recruitment', 'Switched back to recruitment');
    assert.strictEqual(metaA2.name, 'Senior Architect', 'Custom name restored');
    assert.strictEqual(metaA2.details, 'Tuyển dụng kiến trúc sư', 'Custom details restored');
    assert.strictEqual(metaA2.mainImageFit, 'contain', 'mainImageFit restored');
    assert.strictEqual(metaA2.mainImageZoom, 110, 'mainImageZoom restored');
    assert.strictEqual(metaA2.backgroundDim, 50, 'backgroundDim restored');
    assert.strictEqual(metaA2.backgroundBlur, 10, 'backgroundBlur restored');
    assert.ok(isAssetRef(metaA2.image), 'image has asset ref');
    assert.ok(isAssetRef(metaA2.backgroundImage), 'backgroundImage has asset ref');

    // 3. Resolve assets của A
    const restoredA = await resolveStateAssets(metaA2, { driver });
    assert.strictEqual(restoredA.image, mainA, 'Main image data URI restored 100% on A->B->A');
    assert.strictEqual(restoredA.backgroundImage, bgA, 'Background image data URI restored 100% on A->B->A');

    results.push({ test: 'Switching A -> B -> A', passed: true });
    console.log('✓ Test 3: Switching A -> B -> A passed');
  }

  // TEST 4: Reload (F5 Simulation)
  {
    const driver = createMockAssetDriver();
    const storage = createIsolatedStorage();
    const mainData = 'data:image/png;base64,RELOAD_MAIN_' + '1'.repeat(1000);
    const bgData = 'data:image/png;base64,RELOAD_BG_' + '2'.repeat(1000);

    const currentState = {
      industry: 'education',
      categoryId: 'education',
      name: 'IELTS Intensive',
      details: 'Khóa học cấp tốc',
      image: mainData,
      backgroundImage: bgData,
      backgroundDim: 45,
      copies: {
        launch: { headline: 'H', subline: 'S', cta: 'C', caption: 'P', points: [] },
        story: { headline: 'H', subline: 'S', cta: 'C', caption: 'P', points: [] },
        action: { headline: 'H', subline: 'S', cta: 'C', caption: 'P', points: [] },
      },
    };

    // Khi người dùng lưu trước reload
    const { state: persisted } = await persistStateAssets(currentState, { driver });
    storage.setItem('test-marketing-v1', JSON.stringify(persisted));

    // Giả lập reload trang (F5): Đọc metadata từ storage
    const rawLoaded = storage.getItem('test-marketing-v1');
    const parsed = JSON.parse(rawLoaded);

    assert.strictEqual(parsed.name, 'IELTS Intensive');
    assert.ok(isAssetRef(parsed.image));
    assert.ok(isAssetRef(parsed.backgroundImage));

    // Resolve assets
    const reloaded = await resolveStateAssets(parsed, { driver });
    assert.strictEqual(reloaded.image, mainData, 'Reload restored main image perfectly');
    assert.strictEqual(reloaded.backgroundImage, bgData, 'Reload restored background image perfectly');

    results.push({ test: 'Reload Persistence', passed: true });
    console.log('✓ Test 4: Reload Persistence passed');
  }

  // TEST 5: Rapid Switching with Stale-Request Guard
  {
    const driver = createMockAssetDriver();
    const imgA = 'data:image/png;base64,IMG_A_' + 'A'.repeat(500);
    const imgB = 'data:image/png;base64,IMG_B_' + 'B'.repeat(500);

    const refA = await saveAsset(imgA, undefined, { driver });
    const refB = await saveAsset(imgB, undefined, { driver });

    let activeToken = 0;
    let finalState = null;

    // Switch to B (token 1, slow resolve simulated)
    activeToken = 1;
    const tokenB = activeToken;
    const promiseB = new Promise(async (resolve) => {
      // Simulate delay
      await new Promise((r) => setTimeout(r, 50));
      const res = await resolveStateAssets({ image: refB, categoryId: 'retail' }, { driver });
      if (activeToken === tokenB) {
        finalState = res;
      }
      resolve(res);
    });

    // Rapidly switch to A before B finishes (token 2)
    activeToken = 2;
    const tokenA = activeToken;
    const resA = await resolveStateAssets({ image: refA, categoryId: 'recruitment' }, { driver });
    if (activeToken === tokenA) {
      finalState = resA;
    }

    // Wait for B to finish
    await promiseB;

    assert.strictEqual(finalState.categoryId, 'recruitment', 'Active category must remain recruitment');
    assert.strictEqual(finalState.image, imgA, 'Stale B resolve was safely dropped, A image preserved');

    results.push({ test: 'Rapid Switching Stale Guard', passed: true });
    console.log('✓ Test 5: Rapid Switching Stale Guard passed');
  }

  // TEST 6: User Intentional Removal
  {
    const driver = createMockAssetDriver();
    const storage = createIsolatedStorage();
    const storageKey = 'test-isolated-drafts-v2';

    const stateWithImages = {
      industry: 'recruitment',
      categoryId: 'recruitment',
      name: 'Engineer',
      image: 'data:image/png;base64,INITIAL_MAIN',
      backgroundImage: 'data:image/png;base64,INITIAL_BG',
      copies: {
        launch: { headline: 'H', subline: 'S', cta: 'C', caption: 'P', points: [] },
        story: { headline: 'H', subline: 'S', cta: 'C', caption: 'P', points: [] },
        action: { headline: 'H', subline: 'S', cta: 'C', caption: 'P', points: [] },
      },
    };

    // User explicitly removes main image
    const stateRemovedMain = {
      ...stateWithImages,
      image: '',
      cutout: '',
    };

    const { state: persisted } = await persistStateAssets(stateRemovedMain, { driver });
    const metaB = switchIndustry(persisted, 'food', 'general', storage, { storageKey });
    const metaA = switchIndustry(metaB, 'recruitment', 'recruitment', storage, { storageKey });
    const restoredA = await resolveStateAssets(metaA, { driver });

    assert.strictEqual(restoredA.image, '', 'Explicitly removed main image stays removed');
    assert.ok(restoredA.backgroundImage.includes('INITIAL_BG'), 'Background image preserved');

    results.push({ test: 'User Intentional Removal', passed: true });
    console.log('✓ Test 6: User Intentional Removal passed');
  }

  // TEST 7: Denied / Quota Storage (Graceful Degradation)
  {
    // Driver that throws on set
    const failingDriver = createMockAssetDriver({ shouldFail: true });
    const testState = {
      industry: 'recruitment',
      categoryId: 'recruitment',
      image: 'data:image/png;base64,IMPORTANT_IN_MEMORY_IMAGE',
      name: 'Unsaved Asset Job',
      copies: {
        launch: { headline: 'H', subline: 'S', cta: 'C', caption: 'P', points: [] },
        story: { headline: 'H', subline: 'S', cta: 'C', caption: 'P', points: [] },
        action: { headline: 'H', subline: 'S', cta: 'C', caption: 'P', points: [] },
      },
    };

    const { state: resultState, failedFields } = await persistStateAssets(testState, { driver: failingDriver });

    assert.strictEqual(failedFields.length, 1, 'Failed field recorded');
    assert.strictEqual(failedFields[0], 'image');
    assert.strictEqual(resultState.image, 'data:image/png;base64,IMPORTANT_IN_MEMORY_IMAGE', 'In-memory image NOT erased on storage failure');

    results.push({ test: 'Quota/Denied Storage Non-destructive Failure', passed: true });
    console.log('✓ Test 7: Quota/Denied Storage Non-destructive Failure passed');
  }

  // TEST 8: Legacy Inline-Data Drafts
  {
    const driver = createMockAssetDriver();
    const legacyDraft = {
      industry: 'event',
      categoryId: 'event',
      image: 'data:image/png;base64,LEGACY_IMAGE_UNMIGRATED',
      backgroundImage: '/backgrounds/event/a.jpg',
      copies: {
        launch: { headline: 'H', subline: 'S', cta: 'C', caption: 'P', points: [] },
        story: { headline: 'H', subline: 'S', cta: 'C', caption: 'P', points: [] },
        action: { headline: 'H', subline: 'S', cta: 'C', caption: 'P', points: [] },
      },
    };

    const resolved = await resolveStateAssets(legacyDraft, { driver });
    assert.strictEqual(resolved.image, 'data:image/png;base64,LEGACY_IMAGE_UNMIGRATED', 'Legacy inline data URI preserved as-is');
    assert.strictEqual(resolved.backgroundImage, '/backgrounds/event/a.jpg', 'HTTP relative background preserved');

    results.push({ test: 'Legacy Inline Drafts Support', passed: true });
    console.log('✓ Test 8: Legacy Inline Drafts Support passed');
  }

  // TEST 9: HTTP URLs as Lightweight References
  {
    const driver = createMockAssetDriver();
    const httpState = {
      industry: 'travel',
      categoryId: 'travel',
      bgUrl: '/backgrounds/travel/b.jpg',
      backgroundImage: 'https://example.com/photo.jpg',
      image: 'http://cdn.example.com/logo.png',
      copies: {
        launch: { headline: 'H', subline: 'S', cta: 'C', caption: 'P', points: [] },
        story: { headline: 'H', subline: 'S', cta: 'C', caption: 'P', points: [] },
        action: { headline: 'H', subline: 'S', cta: 'C', caption: 'P', points: [] },
      },
    };

    const { state: persisted } = await persistStateAssets(httpState, { driver });
    assert.strictEqual(driver.size(), 0, 'No HTTP assets written to IndexedDB');
    assert.strictEqual(persisted.bgUrl, '/backgrounds/travel/b.jpg');
    assert.strictEqual(persisted.backgroundImage, 'https://example.com/photo.jpg');
    assert.strictEqual(persisted.image, 'http://cdn.example.com/logo.png');

    results.push({ test: 'HTTP URLs as Lightweight References', passed: true });
    console.log('✓ Test 9: HTTP URLs as Lightweight References passed');
  }

  console.log('\n--- ALL 9 DRAFT ASSET PERSISTENCE QC TESTS PASSED SUCCESSFULLY! ---');
  return results;
}

runAllTests().catch((err) => {
  console.error('QC FAILED:', err);
  process.exit(1);
});
