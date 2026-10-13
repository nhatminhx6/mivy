# Preview / ZIP font parity repair

Dispatched 2026-10-13 15:03 UTC to existing idle Gemini 3.8 Flash High session; UI confirmed Working. Await STORY_FONT_PARITY_RESULT.md; do not duplicate job.

Evidence: reports/story-browser-fixed-20261013 standalone page2 PNG versus ZIP page2. Same 1080x1350 dimensions and content, but 43,209 of 1,458,000 pixels differ (pixel-parity.json). Visual inspection shows different headline width and body font weight; this is not merely PNG metadata.

Investigate font readiness as a hypothesis, not a proven cause. Review fixture awaits document.fonts.ready before first canvas draw, but canvas-only font faces/weights may not yet have been requested. ZIP redraw later has different typography. Check actual requested canvas font families/weights and production preview/export preparation. Implement a shared deterministic font preparation step if confirmed, rerender preview after readiness, and ensure export snapshots are captured before asynchronous work. Preserve all unrelated work. No production builds, provider fallback or paid APIs.

Verify cold-page preview PNG vs ZIP with decoded pixel comparison, then actual raster inspection. Include legacy agenda and real recruitment concept, explicit empty points; no false claim from byte inequality alone. Preserve source/content and existing visual designs; no scope expansion.
