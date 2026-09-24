---
name: ui-perfection
description: Strict UI, Canvas Typography, and Layout Perfection standards for Mivy Studio
trigger: always_on
---

# UI & Typography Perfection Guidelines for Mivy Studio

Whenever creating, modifying, or reviewing Canvas rendering, poster templates, or Next.js UI components:

## 1. Pixel-Perfect Vertical Alignment (Canh thẳng hàng tuyệt đối)
- **Zero Magic Y-Offsets**: Never guess arbitrary numbers (e.g. `+ 4`, `+ 10`, `+ 56`) for vertical positioning.
- **Unified Center Axis (`centerY`)**:
  - A badge/index (`01`, `BƯỚC 1`) and the text title next to it MUST share the exact same vertical center `centerY`.
  - Badge top: `badgeY = Math.round(centerY - badgeH / 2)` with `ctx.textBaseline = 'middle'`.
  - Text top: `textY = Math.round(centerY - totalTextH / 2)` with `ctx.textBaseline = 'top'`.
  - Both centers must mathematically equal `centerY`.

## 2. Dynamic Horizontal Offsets & Anti-Overlap (Chống đè chữ)
- **Dynamic Text X**:
  - Never use a hardcoded X offset for text following a badge (e.g. `m + 80`).
  - Calculate dynamically: `textX = badgeX + badgeW + gap` (where `gap` is at least 16–20px).
  - Maximum available text width: `maxTextW = containerW - (textX - containerX + rightPadding)`.

## 3. Strict Clipping & Anti-Bleed for Cards (Chống tràn viền)
- Any card or bento box with dynamic text (like salary, job details, long titles) MUST activate clipping:
  ```typescript
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, radius);
  ctx.clip();
  // ... render card contents safely ...
  ctx.restore();
  ```
- Long text inside cards must use multi-line wrapping or font auto-scaling (`posterText`), never unconstrained single-line `ctx.fillText`.

## 4. Modern DOM & Tailwind Best Practices
- For web UI and layouts:
  - Always use Flexbox (`flex items-center gap-3`) or CSS Grid (`grid grid-cols-3 gap-4`).
  - Use `truncate` or `line-clamp-2` for unpredictable text length.
  - Never allow manual floating or unaligned inline elements.
