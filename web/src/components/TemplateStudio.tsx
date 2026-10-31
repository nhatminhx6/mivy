'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, LayoutGrid, X, ImagePlus, Pencil, Printer } from 'lucide-react';
import { TEMPLATES, TEMPLATE_GROUPS, TemplateDef } from '@/lib/templates-data';
import { AsyncButton } from '@/components/AsyncButton';
import { PRINT_SIZES, exportPrintPdf } from '@/lib/print-export';
import { downloadBlob } from '@/lib/html-export';

const ALL_CSS = Array.from(new Set(TEMPLATES.map((t) => t.css).filter(Boolean))).join('\n');
const FONT_URLS = Array.from(new Set(Array.from(ALL_CSS.matchAll(/@import url\(['"]?([^'")]+)['"]?\)/g)).map((m) => m[1])));
const NON_IMPORT_CSS = ALL_CSS.replace(/@import url\([^)]*\);?/g, '').trim();

export function TemplateStudio({ embedded = false }: { embedded?: boolean }) {
  const [group, setGroup] = useState<string>('Tất cả');
  const [editing, setEditing] = useState<TemplateDef | null>(null);
  const [busy, setBusy] = useState(false);
  const [printSizeId, setPrintSizeId] = useState<string>(PRINT_SIZES[2].id); // mặc định A4
  const [fontCss, setFontCss] = useState<string>('');
  const stageRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let on = true;
    Promise.all(FONT_URLS.map((u) => fetch(u).then((r) => r.text()).catch(() => '')))
      .then((parts) => { if (on) setFontCss(parts.join('\n')); });
    return () => { on = false; };
  }, []);

  const groups = useMemo(() => ['Tất cả', ...TEMPLATE_GROUPS], []);
  const list = useMemo(() => (group === 'Tất cả' ? TEMPLATES : TEMPLATES.filter((t) => t.group === group)), [group]);

  const openEditor = (t: TemplateDef) => {
    setEditing(t);
    setTimeout(() => {
      const root = stageRef.current?.firstElementChild as HTMLElement | undefined;
      if (!root) return;
      root.setAttribute('contenteditable', 'true');
      root.style.outline = 'none';
      root.querySelectorAll('*').forEach((el) => {
        const he = el as HTMLElement;
        if (he.children.length === 0 && /ẢNH|Ảnh/.test(he.textContent || '')) {
          const panel = (he.closest('div[style*="repeating-linear-gradient"]') as HTMLElement) || (he.parentElement as HTMLElement);
          if (panel) {
            panel.setAttribute('data-img-slot', '1');
            panel.style.cursor = 'pointer';
            panel.addEventListener('click', (e) => { e.stopPropagation(); fileRef.current?.click(); (window as any).__slot = panel; });
          }
        }
      });
    }, 40);
  };

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const slot: HTMLElement = (window as any).__slot || stageRef.current?.querySelector('[data-img-slot]');
    const rd = new FileReader();
    rd.onload = () => {
      if (slot) {
        slot.style.backgroundImage = `url(${rd.result})`;
        slot.style.backgroundSize = 'cover';
        slot.style.backgroundPosition = 'center';
        slot.querySelectorAll('*').forEach((c) => { (c as HTMLElement).style.opacity = '0'; });
      }
    };
    rd.readAsDataURL(f);
    e.target.value = '';
  };

  const download = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      if ((document as any).fonts?.ready) await (document as any).fonts.ready;
      const node = stageRef.current!.firstElementChild as HTMLElement;
      const { toPng } = await import('html-to-image');
      const url = await toPng(node, { width: editing.w, height: editing.h, pixelRatio: 2, cacheBust: true, fontEmbedCSS: fontCss, skipFonts: !fontCss });
      const a = document.createElement('a');
      a.href = url; a.download = `mivy-${editing.id}.png`; a.click();
    } catch (err: any) {
      alert('Lỗi tải: ' + (err?.message || err));
    } finally { setBusy(false); }
  };

  const downloadPrint = async () => {
    if (!editing) return;
    const size = PRINT_SIZES.find((s) => s.id === printSizeId) || PRINT_SIZES[2];
    setBusy(true);
    try {
      if ((document as any).fonts?.ready) await (document as any).fonts.ready;
      const node = stageRef.current!.firstElementChild as HTMLElement;
      const blob = await exportPrintPdf(node, {
        size, designW: editing.w, designH: editing.h, fontEmbedCSS: fontCss,
      });
      downloadBlob(blob, `mivy-${editing.id}-${size.id}-in.pdf`);
    } catch (err: any) {
      alert('Lỗi tạo file in: ' + (err?.message || err));
    } finally { setBusy(false); }
  };

  const scale = editing ? Math.min((typeof window !== 'undefined' ? window.innerHeight : 900) * 0.72 / editing.h, 520 / editing.w) : 1;

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: fontCss + '\n' + NON_IMPORT_CSS }} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />

      {!embedded && (
        <div className="mb-5">
          <h1 className="mv-h1 !text-2xl flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-indigo-300" /> Mẫu thiết kế</h1>
          <p className="mv-sub !mt-0.5">{TEMPLATES.length} mẫu · <b className="text-slate-300">bấm mẫu để sửa chữ + thả ảnh + tải PNG</b>.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-5">
        {groups.map((g) => (
          <button key={g} type="button" onClick={() => setGroup(g)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${group === g ? 'bg-indigo-500/15 border-indigo-500/50 text-white' : 'border-white/10 text-slate-400 hover:text-white hover:border-white/25'}`}>{g}</button>
        ))}
      </div>

      <div className="flex flex-wrap gap-5">
        {list.map((t) => {
          const W = 260; const s = W / t.w;
          return (
            <button key={t.id} type="button" onClick={() => openEditor(t)} style={{ width: W }} className="group text-left space-y-2">
              <div className="rounded-xl overflow-hidden border border-white/10 group-hover:border-indigo-500/50 bg-black/40 relative transition-colors" style={{ width: W, height: Math.round(t.h * s) }}>
                <div style={{ width: t.w, height: t.h, transform: `scale(${s})`, transformOrigin: 'top left', pointerEvents: 'none' }} dangerouslySetInnerHTML={{ __html: t.html }} />
                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-sm font-semibold"><Pencil className="w-4 h-4" /> Sửa &amp; tải</div>
              </div>
              <span className="text-[11px] text-slate-400 truncate block" title={t.title}>{t.title}</span>
            </button>
          );
        })}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex flex-col" style={{ height: '100dvh' }}>
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
            <div className="text-sm text-white font-semibold">{editing.title}</div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} className="mv-btn mv-btn-ghost !px-3 !py-1.5 !text-xs"><ImagePlus className="w-4 h-4" /> Thả ảnh</button>
              <AsyncButton onClick={download} disabled={busy} loadingText="Đang tạo…" className="mv-btn mv-btn-ghost !px-4 !py-1.5 !text-xs disabled:opacity-50"><Download className="w-4 h-4" /> Tải PNG</AsyncButton>
              <div className="flex items-center rounded-lg border border-white/15 overflow-hidden">
                <select value={printSizeId} onChange={(e) => setPrintSizeId(e.target.value)} disabled={busy}
                  className="bg-white/5 text-slate-200 text-xs px-2 py-1.5 focus:outline-none max-w-[190px]">
                  {Array.from(new Set(PRINT_SIZES.map((s) => s.group))).map((g) => (
                    <optgroup key={g} label={g} className="bg-slate-900">
                      {PRINT_SIZES.filter((s) => s.group === g).map((s) => (
                        <option key={s.id} value={s.id} className="bg-slate-900">{s.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <AsyncButton onClick={downloadPrint} disabled={busy} loadingText="Đang tạo…" className="mv-btn mv-btn-primary !rounded-none !px-3 !py-1.5 !text-xs disabled:opacity-50"><Printer className="w-4 h-4" /> Tải file in</AsyncButton>
              </div>
              <button type="button" onClick={() => setEditing(null)} className="mv-btn mv-btn-ghost !p-2"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-6">
            <div style={{ position: 'relative', width: editing.w * scale, height: editing.h * scale, overflow: 'hidden', flex: '0 0 auto', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
              <div ref={stageRef} style={{ position: 'absolute', top: 0, left: 0, width: editing.w, height: editing.h, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                <div style={{ width: editing.w, height: editing.h }} dangerouslySetInnerHTML={{ __html: editing.html }} />
              </div>
            </div>
          </div>
          <div className="text-center text-[11px] text-slate-500 pb-3">Bấm chữ để sửa · bấm vùng ảnh để thay · <b className="text-slate-300">Tải PNG</b> để xem online, <b className="text-slate-300">Tải file in</b> (PDF có lề tràn + vạch cắt) để gửi xưởng in</div>
        </div>
      )}
    </div>
  );
}
