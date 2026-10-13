# Story Source & Pagination Consistency — Implementation Result

**Date**: 2026-10-13  
**Scope**: Shared story-source & pagination resolver across canvas renderers, UI controls, export snapshots, and isolated dev fixtures (`back-end/docs/template-v2/STORY_SOURCE_REPAIR.md`).

---

## 1. Summary of Repair

1. **Shared Pure Story-Source Resolver (`web/src/lib/balanced-pages.ts` & `web/src/lib/story-source.ts`)**:
   - Implemented `resolveStoryPoints`, `resolveStorySource`, `slicePages`, `clampStoryPageInState`, `snapshotStoryState`, and `createExportSnapshot`.
   - **Point List & Line Normalization**:
     - `normalizePointList(input)` handles string or array of strings, splits each entry by `/\r?\n|\r/`, trims every line, and discards empty lines (`trimmed.length > 0`).
     - `makeIndustryCopy(category, fields)` splits multiline industry fields (`requirements`, `benefits`, `amenities`, `description`) by `/\r?\n|\r/`, trims each item, and filters with `.filter(Boolean)`.
   - **Per-Page Normalization**:
     - `normalizePerPage(rawPerPage)` validates `Number.isInteger(n) && n > 0`, defaulting to `3` for any invalid or non-positive value.
   - **Catalog & Concept Validation (`isValidIndustryConcept`)**:
     - Validates `conceptId` strictly against production catalog IDs in `VALID_CONCEPT_IDS` / `CONCEPTS`:
       - `recruitment-announcement`, `recruitment-team` (category: `recruitment`)
       - `property-architecture`, `property-brochure` (category: `property`)
       - `food-hero`, `food-menu` (category: `food`)
     - Enforces that `conceptId` must match the prefix `${categoryId}-`. Any non-catalog or mismatched ID (e.g. `recruitment-editorial`, `property-luxury`, `property-blueprint`) returns `false`.
   - **Strict Source Precedence**:
     - **Industry concepts (`isValidIndustryConcept(state)`)**: Uses concept-owned `copy.points` (or empty when `pointsEdited = true` and `points = []`) and paginates with `balancedPages(items, perPage)` so `10` items at `3/page` is balanced as `3 / 3 / 2 / 2`.
     - **Explicit manual edit (`copy.pointsEdited === true`)**: Uses `normalizePointList(copy.points)` directly. When intentionally cleared to `[]`, returns `items = []`, `pages = [[]]`, `totalPages = 1`, `pageIndex = 0`, `pageItems = []` — never refilling from `facts` or `details` and never manufacturing fallback text.
     - **Legacy / non-concept drafts (`!isValidIndustryConcept(state)` and `!copy.pointsEdited`)**: Preserves fallback chain: non-empty `copy.points` → selected `state.facts` (`f.selected`) → non-blank lines of `state.details`, paginated with `slicePages(items, perPage)` (e.g. 5 items → 3 + 2; 10 items → 3 / 3 / 3 / 1).

2. **Renderer Synchronization & Generic Story Fallback Repair (`catalog-renderer.ts`, `industry-renderer.ts`, `design-engine.ts`)**:
   - Updated `drawCatalogPoster`, `drawIndustryConcept`, `drawRecruitmentStory`, `drawFullPhotoRecruitmentStory`, `drawFullPhotoGeneral`, `drawEducationPoster`, and `drawServicePoster` to consume `resolveStorySource(state, copy)`.
   - **Generic Story Fallback Repair in `drawGeneralModernPoster`**:
     - Investigated renderer dispatch: unconfigured legacy drafts without a catalog `templateId` fell through to `drawGeneralModernPoster`, which previously lacked a `kind === 'story'` branch and blindly rendered a generic single-card "FEATURED CAMPAIGN" hero layout, dropping all resolved story details.
     - Added a dedicated `kind === 'story'` branch to `drawGeneralModernPoster` that renders the story pagination badge (`TRANG X/Y · ĐIỂM NỔI BẬT` / `PAGE X/Y · HIGHLIGHTS`), headline, and story cards via `drawCheckCards(ctx, resolved.pageItems, ...)` while preserving intentional empty clears.
   - Removed manufactured fallback points (`[copy.subline]` and hardcoded EN/VI default recruitment sentences) across all story renderers.
   - Left production property concept layouts (`property-architecture`, `property-brochure`) completely untouched.

3. **UI Controls & Editor Synchronization (`web/src/app/studio/marketing/page.tsx`, `web/src/lib/draft-controller.ts`)**:
   - Updated Story Carousel Pagination Controls (`totalStoryPages`, `safeStoryPage`) and the Story points `<textarea>` editor to read from `resolveStorySource(state, state.copies.story)`.
   - Clamped `storyPage` automatically via `clampStoryPageInState` in both `page.tsx`'s `saveState` and `DraftController.saveState` whenever story items shrink.

4. **Synchronous Export Snapshot & Archive Integrity (`web/src/app/studio/marketing/page.tsx`)**:
   - `prepareExport()` snapshots `state` synchronously via `structuredClone(state)` and locks the resolved story items onto the snapshot (`balancedPages.snapshotStory(snapshot)`) before `await document.fonts.ready` or any async image/blob operations.
   - `handleDownloadZip`, `handleDownloadSingle`, and `handleDownloadAllSizes` all resolve story pages from the frozen snapshot (`resolveStorySource(snapshot, snapshot.copies.story)`), ensuring mid-export edits to live state cannot alter the archive and the user's live draft is never mutated.

5. **Isolated Dev Review Fixture (`web/src/app/studio/marketing/review/story-source/page.tsx`)**:
   - Added a dev-only (`process.env.NODE_ENV === 'production' -> notFound()`) in-memory review fixture at `/studio/marketing/review/story-source` (linked from `/studio/marketing/review`).
   - Fixed scenario 1 (`buildLegacy5LineState`) to explicitly set `templateId: 'agenda'`, matching the original agenda repro.
   - Fixed scenario 3 (`buildBalanced10ConceptState`) to use the valid catalog concept `recruitment-announcement` (replacing nonexistent `recruitment-editorial`), properly activating `balancedPages` to render 4 cards with sizes `3 / 3 / 2 / 2`.
   - Scenarios available in fixture:
     1. Legacy 5-line agenda (`templateId: 'agenda'`, `points = []`, `pointsEdited = false`) → 2 Story pages (`3 + 2`), with page 1 showing items 1..3 and page 2 showing items 4..5.
     2. Intentional empty clear (`points = []`, `pointsEdited = true` with `facts` & `details` present) → 1 empty Story page (`0 items`).
     3. 10-item Industry Concept (`recruitment-announcement`, `storyPerPage = 3`) → 4 balanced Story pages (`3 / 3 / 2 / 2`), with page 4 showing items 9..10.
   - Renders real `<canvas>` previews via `drawIndustryPoster` and generates downloadable per-page PNGs and full ZIP packs (`marketingZip`). Does not read or write `localStorage` or IndexedDB.

---

## 2. Files Changed

- `web/src/lib/balanced-pages.ts`
- `web/src/lib/story-source.ts` (re-export module)
- `web/src/lib/industry-concepts.ts`
- `web/src/lib/industry-renderer.ts`
- `web/src/lib/catalog-renderer.ts`
- `web/src/lib/design-engine.ts`
- `web/src/lib/draft-controller.ts`
- `web/src/app/studio/marketing/page.tsx`
- `web/src/app/studio/marketing/review/page.tsx`
- `web/src/app/studio/marketing/review/story-source/page.tsx`
- `web/verify-story-source-qc.cjs`
- `back-end/docs/template-v2/STORY_SOURCE_RESULT.md`

---

## 3. Exact Verification Commands & Results

### 3.1 Story-Source Pagination & Snapshot QC (`node verify-story-source-qc.cjs`)
Command run in `/Users/minh.nn1/Projects/personal/mivy/web`:
```bash
node verify-story-source-qc.cjs
```
Result (`exit code 0`):
- **Test 1**: Five source lines / no points (`copies.story.points = []`, `pointsEdited = false`, 5 lines in `details`) → `totalPages = 2` (`3 + 2`), UI controls show `2` pages, ZIP exports `02-story-page1-poster.png` and `02-story-page2-poster.png` with exact once-only order. **PASS**
- **Test 2**: Selected facts outrank raw details (`2` selected facts, `1` unselected fact, `5` raw detail lines) → resolves exactly the `2` selected facts (`1` page), excluding unselected facts and raw details. **PASS**
- **Test 3**: Explicit `copy.points` (`2` items) outrank `4` selected facts and `5` raw detail lines. **PASS**
- **Test 4**: Intentional clear (`points = []`, `pointsEdited = true`) with non-empty `facts` and `details` → stays empty (`0` items, `totalPages = 1`, `pages = [[]]`), pagination controls hidden (`totalStoryPages <= 1`), renderers draw `0` point cards without manufacturing fallback text, ZIP exports `1` empty Story page (`02-story-poster.png`). **PASS**
- **Test 5**: `10` concept items (`recruitment-announcement`, `perPage = 3`) → `balancedPages` produces `4` pages of sizes `[3, 3, 2, 2]`, and ZIP exports `4` Story pages (`p1of4`..`p4of4`). **PASS**
- **Test 6**: Mid-export mutation during async `document.fonts.ready` / `toBlob` (live state mutated to `['MUTATED 1']`, `details = 'MUTATED DETAILS'`, `storyPage = 99`) → exported ZIP still contains initial items across `2` Story pages, and original live state object is not mutated. **PASS**
- **Test 7**: Source shrink clamps selected page (`storyPage = 3` shrunk from `10` items to `2` items) → clamped to `storyPage = 0` (`pageIndex = 0`, `totalPages = 1`) across resolver, controllers, renderers, and single/all-size exports. **PASS**
- **Test 8**: CRLF/CR/blank-line normalization (`\r\n`, `\r`, whitespace-only lines) and VI/EN pagination label rendering (`TRANG 1/2` vs `PAGE 1/2`). **PASS**
- **Test 9**: **Fixture and Catalog Concept Consistency Verification**:
  - Confirms 1-to-1 parity between production `CONCEPTS` catalog and `VALID_CONCEPT_IDS`.
  - Confirms all catalog concepts evaluate `isValidIndustryConcept === true` when paired with their category.
  - Confirms nonexistent concepts (`recruitment-editorial`, `property-luxury`, `property-blueprint`) evaluate `isValidIndustryConcept === false`.
  - Statically verifies fixture file contains zero nonexistent concept references and all assigned concept IDs exist in the catalog.
  - Verifies the actual 10-item scenario state from fixture resolves to `isConcept: true`, `totalPages: 4`, and `pages: [3, 3, 2, 2]`. **PASS**
- **Test 10**: **Production `drawIndustryPoster` Story Content Verification (Agenda & Generic Fallback)**:
  - Verifies that calling `drawIndustryPoster` for `templateId: 'agenda'` renders actual items 1..3 on Page 1, items 4..5 on Page 2, and does not leak items across pages or render generic hero texts.
  - Verifies that calling `drawIndustryPoster` for unconfigured generic drafts (`templateId: undefined`, `conceptId: ''`, no photo) renders actual story checklist items on Page 1 (`lines 1..3`) and Page 2 (`lines 4..5`) rather than generic "FEATURED CAMPAIGN" / "Sản phẩm nổi bật". **PASS**

### 3.2 Regression Suites & TypeScript Typecheck
Commands run in `/Users/minh.nn1/Projects/personal/mivy/web`:
```bash
npx tsc --noEmit
node verify-balanced-pages.cjs
node verify-export-snapshot.cjs
node verify-export-pack.cjs
node verify-industry-concepts.cjs
node verify-input-quality.cjs
node verify-draft-asset-lifecycle-qc.cjs
node verify-draft-asset-qc.cjs
```
Results (all `exit code 0`):
- `npx tsc --noEmit`: 0 errors.
- `verify-balanced-pages.cjs`: 126 pagination combinations passed (`10 → 3/3/2/2`, content/order, bounds, offsets).
- `verify-export-snapshot.cjs`: Export snapshot passed.
- `verify-export-pack.cjs`: ZIP integration passed.
- `verify-industry-concepts.cjs`: 216 render cases passed.
- `verify-input-quality.cjs`: Input QC passed.
- `verify-draft-asset-lifecycle-qc.cjs`: 10/10 production DraftController lifecycle & identity tests passed.
- `verify-draft-asset-qc.cjs`: 9/9 draft asset persistence QC tests passed.

---

## 4. Remaining Limitations & QC Hand-off

- **Browser Visual & Archive QC**: Unit and integration tests verify data flow, canvas text rendering, catalog consistency, and ZIP entry structure in Node, which does not constitute visual acceptance. Actual browser rendering, PNG inspection, and downloaded ZIP verification are ready for independent Codex QC via `/studio/marketing/review/story-source` (or `/studio/marketing`).
- **Property Layout**: Per instructions, the separate CLI property layout task was not resumed or modified.
