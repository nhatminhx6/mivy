'use client';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { TemplateDef } from '@/lib/templates-data';
import { fillTemplateHtml, FillContent } from '@/lib/template-fill';

const urlCache = new Map<string, Promise<string>>();
function fetchCss(url: string): Promise<string> {
  if (!urlCache.has(url)) urlCache.set(url, fetch(url).then((r) => r.text()).catch(() => ''));
  return urlCache.get(url)!;
}
function importUrls(css: string): string[] {
  return Array.from(new Set(Array.from(css.matchAll(/@import url\(['"]?([^'")]+)['"]?\)/g)).map((m) => m[1])));
}

export interface TemplateHtmlPreviewHandle {
  exportPng: () => Promise<void>;
}

export const TemplateHtmlPreview = forwardRef<TemplateHtmlPreviewHandle, {
  template: TemplateDef;
  content: FillContent;
  noFill?: boolean;       // true = html đã có nội dung sẵn (skin), không chạy đổ-nội-dung tự suy
  maxHeightVh?: number;
}>(function TemplateHtmlPreview({ template, content, noFill = false, maxHeightVh = 40 }, ref) {
  const [fontCss, setFontCss] = useState<string>('');
  const [boxW, setBoxW] = useState(400);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const nodeRef = useRef<HTMLDivElement | null>(null);

  const nonImportCss = useMemo(() => (template.css || '').replace(/@import url\([^)]*\);?/g, '').trim(), [template.css]);

  useEffect(() => {
    let on = true;
    Promise.all(importUrls(template.css || '').map(fetchCss)).then((parts) => { if (on) setFontCss(parts.join('\n')); });
    return () => { on = false; };
  }, [template.css]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth || 400));
    ro.observe(el);
    setBoxW(el.clientWidth || 400);
    return () => ro.disconnect();
  }, []);

  const filled = useMemo(
    () => (noFill ? template.html : fillTemplateHtml(template.html, content)),
    [template.html, content, noFill],
  );

  const maxH = typeof window !== 'undefined' ? window.innerHeight * (maxHeightVh / 100) : 500;
  const scale = Math.min(boxW / template.w, maxH / template.h);

  useImperativeHandle(ref, () => ({
    exportPng: async () => {
      if ((document as any).fonts?.ready) await (document as any).fonts.ready;
      const { toPng } = await import('html-to-image');
      const url = await toPng(nodeRef.current!, { width: template.w, height: template.h, pixelRatio: 2, cacheBust: true, fontEmbedCSS: fontCss, skipFonts: !fontCss });
      const a = document.createElement('a');
      a.href = url; a.download = `mivy-${template.id}.png`; a.click();
    },
  }), [template, fontCss]);

  return (
    <div ref={wrapRef} className="w-full flex justify-center">
      <style dangerouslySetInnerHTML={{ __html: fontCss + '\n' + nonImportCss }} />
      <div style={{ position: 'relative', width: template.w * scale, height: template.h * scale, overflow: 'hidden', flex: '0 0 auto' }}>
        <div ref={nodeRef} data-testid="ad-preview" style={{ position: 'absolute', top: 0, left: 0, width: template.w, height: template.h, transform: `scale(${scale})`, transformOrigin: 'top left' }}
          dangerouslySetInnerHTML={{ __html: filled }} />
      </div>
    </div>
  );
});
