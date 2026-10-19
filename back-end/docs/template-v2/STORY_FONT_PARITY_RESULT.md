# Preview / ZIP Font Parity Repair — Implementation Result

**Date**: 2026-10-14  
**Scope**: Font readiness, unicode subset completeness & typography parity between on-screen preview, standalone PNG downloads, and ZIP export archives (`back-end/docs/template-v2/STORY_FONT_PARITY_REPAIR.md`).

---

## 1. Root Cause Analysis & Investigation of Browser QC Evidence

### 1.1 Pre-repair & Post-turn Evidence Comparison
- **Oct 13 Evidence (`reports/story-browser-fixed-20261013/pixel-parity.json`)**:
  - `43,209 / 1,458,000` differing pixels between standalone preview PNG and ZIP export.
- **Oct 14 Independent QC (`reports/font-parity-20261014/qc.json`)**:
  - Downloaded on Oct 14 at 16:01 local from a fresh tab with existing browser profile.
  - Recorded `31,582 / 1,458,000` differing pixels between `single.png` (`qc-legacy-5-lines-story-p2-4x5.png`) and `zip/02-story-p2of2-4x5.png`.
- **Determinism of ZIP Archive Export**:
  - Decoded pixel comparison between Oct 13 ZIP page 2 (`reports/story-browser-fixed-20261013/zip/02-story-p2of2-4x5.png`) and Oct 14 ZIP page 2 (`reports/font-parity-20261014/zip/02-story-p2of2-4x5.png`) yielded **exactly 0 differing pixels** (bit-for-bit identical).
  - This confirmed that ZIP export using unattached offscreen canvases (`document.createElement('canvas')`) is 100% deterministic and uses fully loaded fonts.

### 1.2 Exact Glyph, Weight, and Subset Investigation
Decoded inspection of `single.png` vs `zip/02-story-p2of2-4x5.png` revealed two underlying root causes:

1. **Root Cause A: Font Face Subset Starvation (`document.fonts.load(font, text)`)**:
   - In `web/src/lib/poster-font.ts`, `ensurePosterFontsReady` previously passed a restricted string `testChars` to `document.fonts.load(font, testChars)`.
   - Per the W3C CSS Font Loading Module Level 3 specification:
     > When `text` is passed to `FontFaceSet.prototype.load(font, text)`, the browser **only loads font faces whose `unicode-range` matches characters in `text`**.
   - Google Fonts splits web fonts (`Be Vietnam Pro`) across multiple unicode subsets (`vietnamese`, `latin-ext`, `latin`).
   - The previous `testChars` omitted essential characters and punctuation:
     - Special characters: `·` (U+00B7 middle dot in brand `MIVY · QC ...`), `:` (colon in `Workshop:`), `&` (ampersand in `Networking & ...`), `-` (hyphen).
     - Compound Vietnamese diacritics: `ế`, `ệ`, `ự`, `ể`, `ớ`, `ợ`, `ấ`, `ầ`, `ẩ`, `ẫ`, `ậ`, `ố`, `ồ`, `ổ`, `ỗ`, `ộ`, etc.
   - Omission of `text` in `document.fonts.load(font)` forces the browser to load **all font faces and unicode subsets** for that family/weight.
   - In addition, collecting all actual draft text (`state.name`, `details`, `brand`, copy headlines/sublines/points, brand kit) via `collectGlyphsFromState(state)` and supplying it ensures every glyph present in the draft is explicitly requested.

2. **Root Cause B: Asymmetry in Canvas Drawing Targets (Onscreen DOM Canvas vs Offscreen Canvas)**:
   - In `story-source/page.tsx`:
     - `downloadScenarioZip` used `renderBlob`, which created a pristine offscreen canvas: `const c = document.createElement('canvas');`.
     - But `downloadPagePng` used `const canvas = canvasRefs.current[pageIdx];` — the onscreen DOM canvas attached to React, styled by Tailwind CSS (`className="w-full ..."`), and composited by the browser GPU.
   - On high-DPI (Retina) screens, browsers apply display-specific subpixel text antialiasing and fractional positioning to onscreen DOM canvases, differing from the grayscale antialiasing of unattached offscreen canvases.
   - Furthermore, `canvasRefs.current[pageIdx]` had already been painted during component mount prior to full font loading.
   - Similarly, in `marketing/page.tsx`, the preview modal download button previously downloaded `previewUrl` (taken from the onscreen DOM canvas via `toDataURL`) rather than calling the unified `prepareExport` offscreen canvas pipeline.

---

## 2. Implementation Summary

1. **Complete Unicode Subsets & Actual Glyph Coverage (`web/src/lib/poster-font.ts`)**:
   - Added `collectGlyphsFromState(s)` to extract all unique glyphs from `s.name`, `s.brand`, `s.details`, `s.offer`, `s.goal`, `s.industryFields`, `s.copies` (headlines, sublines, captions, points, cta), and `s.brandKit`.
   - Updated `ensurePosterFontsReady`:
     - Calls `document.fonts.load(`${weight} 32px "${family}"`)` **without `text` parameter** so all unicode subsets (`latin`, `latin-ext`, `vietnamese`) are unconditionally downloaded for all weights `400`..`900` across default and preset families (`Be Vietnam Pro`, `Montserrat`, `Caveat`, `Plus Jakarta Sans`, `Playfair Display`, `Lora`).
     - If actual glyphs are present from state, also calls `document.fonts.load(`${weight} 32px "${family}"`, actualGlyphs)` to guarantee explicit coverage of all draft characters.
     - Awaits both `Promise.all(loads)` and `document.fonts.ready`.

2. **Offscreen Canvas Parity for Single PNG in Review Fixture (`web/src/app/studio/marketing/review/story-source/page.tsx`)**:
   - Updated `downloadPagePng`:
     - Replaced `canvasRefs.current[pageIdx]` with `const c = document.createElement('canvas');`.
     - Draws `{ ...snapshot, storyPage: pageIdx }` onto `c` using `drawIndustryPoster(c, pageState, 'story', pageState.copies.story, null)` and exports via `c.toBlob(...)`.
     - Matches `renderBlob` in `downloadScenarioZip` 1-to-1, ensuring identical canvas lifecycle, context options, and dimensions.

3. **Production Modal & Single Export Pipeline Parity (`web/src/app/studio/marketing/page.tsx`)**:
   - Updated `handleDownloadSingle` to accept `overrideKind?: PosterKind | React.MouseEvent`.
   - Replaced preview modal download handler with `handleDownloadSingle(previewKind)`.
   - Guarantees all export actions (export bar single PNG, preview modal single PNG, all sizes ZIP, and marketing pack ZIP) use the identical `prepareExport` offscreen canvas pipeline.

4. **Review Card Font Readiness (`web/src/app/studio/marketing/review/page.tsx`)**:
   - Updated `Card` component to pass `state` to `await ensurePosterFontsReady(state);` after constructing `MarketingState`.

---

## 3. Files Changed

- `web/src/lib/poster-font.ts`
- `web/src/lib/design-engine.ts`
- `web/src/app/studio/marketing/review/story-source/page.tsx`
- `web/src/app/studio/marketing/page.tsx`
- `web/src/app/studio/marketing/review/page.tsx`
- `web/verify-font-parity-qc.cjs`
- `back-end/docs/template-v2/STORY_FONT_PARITY_RESULT.md`

---

## 4. Verification Commands & Results

### 4.1 Focused Font Parity QC Suite (`node verify-font-parity-qc.cjs`)
Command: `node verify-font-parity-qc.cjs` (in `web/`)
Result: **6/6 PASS (100%)**
- **Test 1**: Multi-word font family extraction preserves `"Be Vietnam Pro"`, `"Playfair Display"`, `"Plus Jakarta Sans"`, `"Montserrat"`, `"Lora"`, `"Caveat"` without truncation. **PASS**
- **Test 2**: `ensurePosterFontsReady` requests font faces without restrictive text parameters (loading all unicode subsets) and requests covering actual glyphs across weights `400`..`900`. **PASS**
- **Test 3**: Static verification of `marketing/page.tsx` confirms `ensurePosterFontsReady(state)` in `renderAllCanvases`, `loadingdone` re-render listener, synchronous snapshot before async work, and `handleDownloadSingle(previewKind)` in preview modal. **PASS**
- **Test 4**: Static verification of `story-source/page.tsx` confirms `ensurePosterFontsReady` in preview effect, `loadingdone` re-render, and `downloadPagePng` using fresh offscreen canvas `document.createElement('canvas')` without reusing `canvasRefs.current`. **PASS**
- **Test 5**: Decoded pixel verification confirms baseline evidence of Oct 13 (`43,209` diff pixels) and Oct 14 (`31,582` diff pixels) and documents offscreen ZIP determinism. **PASS**
- **Test 6**: Verification of `collectGlyphsFromState` confirms full extraction of Latin, Vietnamese compound diacritics, and punctuation. **PASS**

### 4.2 Full Regression Suite & Typecheck
Commands run in `web/`:
```bash
node verify-font-parity-qc.cjs
node verify-story-source-qc.cjs
node verify-export-snapshot.cjs
node verify-export-pack.cjs
node verify-balanced-pages.cjs
node verify-industry-concepts.cjs
node verify-input-quality.cjs
node verify-draft-asset-lifecycle-qc.cjs
node verify-draft-asset-qc.cjs
npx tsc --noEmit
```
Results: **ALL PASSED (0 errors, 0 regressions)**.

---

## 5. Remaining Limitations & Hand-off

- **Decoded Pixel Parity Verification**: Codex will independently perform actual browser QC by downloading `qc-legacy-5-lines-story-p2-4x5.png` and `qc-legacy-5-lines-pack-4x5.zip` from `/studio/marketing/review/story-source` (and `/studio/marketing`) to verify decoded pixel equality.
- **Aesthetic Approval**: Automated tests verify technical readiness, unicode subsets, offscreen canvas equivalence, and layout stability; visual aesthetic acceptance is reserved for human review.
