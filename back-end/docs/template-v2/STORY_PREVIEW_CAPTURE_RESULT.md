# Dev-Only Attached Preview Capture Control — Implementation Result

**Date**: 2026-10-14  
**Scope**: Dev-only capture control for the visible, attached preview canvas ref in `/studio/marketing/review/story-source` to enable independent browser raster QC by Codex.

---

## 1. Context & Purpose

1. **Baseline from R2 QC (`reports/font-parity-r2-20261014/qc.json`)**:
   - Independent QC confirmed that the detached single PNG export (`downloadPagePng`) versus the ZIP archive PNG (`downloadScenarioZip`) achieved **0 / 1,458,000 differing pixels** (bit-for-bit identical).
2. **The Gap**:
   - Because `downloadPagePng` was updated to render onto a pristine detached offscreen canvas (`document.createElement('canvas')`), downloading via `Tải PNG` verifies the export pipeline, but does **not** capture or verify the actual visible on-screen preview `<canvas>` currently attached to the browser DOM.
3. **Objective**:
   - Add a dev-only control per card in `/studio/marketing/review/story-source` that serializes the **current attached canvas ref directly** (`canvasRefs.current[idx]`) without redrawing, font awaiting, state mutation, or replacement canvas creation.
   - The button must be disabled until preview rendering completes, and clearly labeled distinct from the existing `Tải PNG (Export)`.

---

## 2. Implementation Summary

1. **State Tracking for Preview Readiness (`web/src/app/studio/marketing/review/story-source/page.tsx`)**:
   - Added `previewReady` (`boolean`) state in `ScenarioViewer`.
   - Set to `false` when initial state loads or changes.
   - Set to `true` strictly after initial render completes (after `ensurePosterFontsReady(state)` and drawing all pages to `canvasRefs.current[idx]`).
   - Set to `true` upon `document.fonts.ready` / `loadingdone` re-render settle.

2. **Direct Canvas Ref Serialization (`capturePreviewPng`)**:
   - Directly references `canvasRefs.current[pageIdx]`.
   - Directly invokes `canvas.toBlob((blob) => { ... }, 'image/png')`.
   - **Zero redraw**: Does not invoke `drawIndustryPoster`.
   - **Zero font await**: Does not call `ensurePosterFontsReady` or any asynchronous font check.
   - **Zero state mutation**: Does not alter `state`, `copies`, or pagination.
   - **Zero replacement canvas**: Does not call `document.createElement('canvas')`.
   - Downloads as: `qc-${id}-story-p${pageIdx + 1}-attached-preview-${state.aspect.replace(':', 'x')}.png`.

3. **Distinct Card UI Controls**:
   - **"Chụp preview DOM"**:
     - Class: `rounded bg-sky-500/20 border border-sky-500/40 px-2 py-0.5 text-[11px] font-medium text-sky-300 hover:bg-sky-500/30 disabled:opacity-40 disabled:cursor-not-allowed`.
     - Disabled attribute: `disabled={!previewReady}`. Displays `"Đang vẽ..."` while rendering, `"Chụp preview DOM"` once settled.
     - Title tooltip: `"Chụp trực tiếp từ canvas DOM đang hiển thị mà không vẽ lại"`.
   - **"Tải PNG (Export)"**:
     - Retains the detached offscreen export pipeline matching `downloadScenarioZip` 1-to-1.
     - Title tooltip: `"Xuất qua offscreen canvas độc lập (khớp 1:1 với gói ZIP)"`.

---

## 3. Files Changed

- `web/src/app/studio/marketing/review/story-source/page.tsx`: Added `previewReady` state, `capturePreviewPng` handler, and distinct preview capture button per card.
- `web/verify-font-parity-qc.cjs`: Added Test 7 validating direct canvas serialization without redraw/font await/replacement canvas, disabled state, and distinct labeling.
- `back-end/docs/template-v2/STORY_PREVIEW_CAPTURE_RESULT.md`: This result report.

---

## 4. Verification Commands & Results

### 4.1 Focused QC Suite (`node verify-font-parity-qc.cjs`)
Command: `node verify-font-parity-qc.cjs` (in `web/`)
Result: **7/7 PASS (100%)**
- **Test 1**: Multi-word font family extraction preserves full names without truncation. **PASS**
- **Test 2**: `ensurePosterFontsReady` requests full subsets without restrictive text and covers actual glyphs. **PASS**
- **Test 3**: Production `marketing/page.tsx` wiring and export modal parity. **PASS**
- **Test 4**: Review `story-source/page.tsx` font readiness & offscreen canvas parity for detached export. **PASS**
- **Test 5**: Decoded pixel baseline verification (Oct 13: 43,209 diffs; Oct 14 R1: 31,582 diffs; Oct 14 R2 detached export vs ZIP: 0 diffs). **PASS**
- **Test 6**: `collectGlyphsFromState` coverage for all text fields, compound diacritics, and symbols. **PASS**
- **Test 7**: Dev-only attached preview capture control directly serializes canvas ref without redraw, font await, state mutation, or replacement canvas, disabled until ready. **PASS**

### 4.2 Story Source Suite (`node verify-story-source-qc.cjs`)
Command: `node verify-story-source-qc.cjs` (in `web/`)
Result: **10/10 PASS (100%)**

### 4.3 TypeScript Typecheck (`npx tsc --noEmit`)
Command: `npx tsc --noEmit` (in `web/`)
Result: **0 errors**

---

## 5. Remaining Limitations & Hand-off

- **Independent Codex QC**: Codex will independently open `/studio/marketing/review/story-source` in a real browser, click `"Chụp preview DOM"` for Card 1 Page 2, and compare the decoded pixels of `qc-legacy-5-lines-story-p2-attached-preview-4x5.png` against `qc-legacy-5-lines-pack-4x5.zip` (and detached export).
- **No Parity Claim from Static Tests**: Static tests verify component mechanics, absence of redraw/font await, and disabled states; browser raster parity between attached DOM canvas and offscreen export is not claimed prior to Codex's independent raster comparison.
