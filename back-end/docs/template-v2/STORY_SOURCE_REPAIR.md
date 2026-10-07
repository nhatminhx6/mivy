# Gemini repair: resolve story source consistently

Status: prepared, not dispatched. Do not start while previous provider job completion is unresolved.

Reproduction: web/verify-fallback-pages-qc.cjs; reports/fallback-pages-20261006/result.json. Legacy agenda, empty points, five details lines: ZIP count1, renderer can draw page2 containing lines4/5. UI count also uses points only. This is code/raster reproduction; browser reproduction pending.

Implementation contract:
- One pure resolver shared by renderer, page controls and export snapshot. Explicit manual points (including intentionally empty pointsEdited=true) take precedence; do not refill an intentional clear.
- For unmigrated legacy drafts only, preserve existing precedence: nonempty copy.points, selected facts, then nonblank details lines. Do not manufacture facts.
- Preserve industry-concept semantics and balanced pagination; legacy slicing must use same resolved items and count everywhere.
- Resolve snapshot contents once before async export. Do not read later live state or alter the original draft.
- Clamp selected page when source shrinks. Zero items still has one empty page; hide unnecessary navigation.

Tests: five source lines/no points => two exported pages with exact once-only order; selected facts outrank raw details; explicit points outrank facts; intentional clear stays empty;10 concept items remain3/3/2/2; mid-export mutation cannot alter archive; source shrink clamps page; VI/EN and newline handling.

Acceptance requires actual browser ZIP and PNG inspection in addition to meaningful tests. Keep code changes narrow, return patch, do not run production build into live .next. Do not rewrite unrelated templates. passed=false unless tests actually executed.
