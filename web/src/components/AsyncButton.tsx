'use client';
// Nút cho thao tác phải chờ (gọi API, tách nền, xuất ảnh/ZIP): bấm là hiện vòng xoay + khoá nút tới khi xong, chặn bấm 2 lần.

import { useState, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
  onClick: (e: MouseEvent<HTMLButtonElement>) => unknown;
  loadingText?: ReactNode; // chữ hiện khi đang chạy (mặc định giữ nguyên chữ của nút)
  iconOnly?: boolean; // nút chỉ có icon → thay icon bằng vòng xoay
};

export function AsyncButton({ onClick, loadingText, iconOnly, children, disabled, className = '', ...rest }: Props) {
  const [busy, setBusy] = useState(false);
  const click = async (e: MouseEvent<HTMLButtonElement>) => {
    if (busy) return;
    const r = onClick(e);
    if (r && typeof (r as Promise<unknown>).then === 'function') {
      setBusy(true);
      try { await r; } finally { setBusy(false); }
    }
  };
  return (
    <button type="button" {...rest} onClick={click} disabled={disabled || busy} aria-busy={busy} className={`${className} ${busy ? 'cursor-wait' : ''}`}>
      {busy
        ? iconOnly ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Loader2 className="w-4 h-4 animate-spin shrink-0" /><span>{loadingText ?? 'Đang xử lý…'}</span></>
        : children}
    </button>
  );
}
