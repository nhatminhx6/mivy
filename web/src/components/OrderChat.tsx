'use client';
// Khung chat theo đơn in (khách ↔ Mivy). Polling nhẹ: chỉ hỏi tin mới (?after=) mỗi 4s KHI đang mở
// và tab đang hiện → đóng khung hoặc rời tab là dừng, không tốn hạ tầng. v1 chỉ nhắn chữ.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { messageApi, type MsgSender, type OrderMessage } from '@/lib/auth';

const POLL_MS = 4000;

export function OrderChat({ orderId, role, unread = 0 }: { orderId: number; role: MsgSender; unread?: number }) {
  const [open, setOpen] = useState(false);
  const [badge, setBadge] = useState(unread);
  const [msgs, setMsgs] = useState<OrderMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const afterRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const api = role === 'admin' ? messageApi.adminList : messageApi.list;
  const sendApi = role === 'admin' ? messageApi.adminSend : messageApi.send;

  const scrollDown = () => requestAnimationFrame(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; });

  const poll = useCallback(async () => {
    try {
      const fresh = await api(orderId, afterRef.current);
      if (fresh.length) {
        afterRef.current = fresh[fresh.length - 1].id;
        setMsgs((prev) => [...prev, ...fresh]);
        setBadge(0); // đang mở + vừa tải = coi như đã đọc
        scrollDown();
      }
    } catch (e) { setErr(e instanceof Error ? e.message : 'Lỗi tải tin nhắn'); }
  }, [api, orderId]);

  // Mở khung → tải lần đầu rồi bật polling; đóng/ẩn tab → dừng.
  useEffect(() => {
    if (!open) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => { if (!timer) timer = setInterval(() => { if (!document.hidden) poll(); }, POLL_MS); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    setLoading(true);
    poll().finally(() => setLoading(false));
    start();
    const onVis = () => { if (document.hidden) stop(); else { poll(); start(); } };
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [open, poll]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true); setErr('');
    try {
      const m = await sendApi(orderId, body);
      afterRef.current = m.id;
      setMsgs((prev) => [...prev, m]);
      setText(''); scrollDown();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Không gửi được'); }
    finally { setSending(false); }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} data-testid="chat-open"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-mv-accent hover:underline">
        <MessageSquare className="w-3.5 h-3.5" />
        {role === 'admin' ? 'Chat với khách' : 'Nhắn với Mivy'}
        {badge > 0 && <span className="ml-0.5 rounded-full bg-amber-500 text-white px-1.5 py-0.5 text-[10px] leading-none">{badge}</span>}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-mv-hair bg-ink/[0.02] overflow-hidden" data-testid="chat-panel">
      <div className="flex items-center justify-between px-3 py-2 border-b border-mv-hair">
        <span className="text-xs font-bold text-mv-fg">{role === 'admin' ? 'Chat với khách' : 'Nhắn với Mivy'}</span>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-400 hover:text-mv-fg">Thu gọn</button>
      </div>
      <div ref={listRef} className="max-h-64 overflow-y-auto px-3 py-3 space-y-2">
        {loading && msgs.length === 0 ? <Loader2 className="w-4 h-4 animate-spin text-slate-400 mx-auto" />
          : msgs.length === 0 ? <p className="text-xs text-slate-400 text-center py-2">Chưa có tin nhắn. Gửi câu hỏi hoặc yêu cầu cho {role === 'admin' ? 'khách' : 'Mivy'} nhé.</p>
          : msgs.map((m) => {
            const mine = m.sender === role;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-xs leading-relaxed whitespace-pre-wrap break-words ${mine ? 'bg-mv-accent text-white rounded-br-sm' : 'bg-white border border-mv-hair text-mv-fg rounded-bl-sm'}`}>
                  {m.body}
                  <div className={`text-[10px] mt-0.5 ${mine ? 'text-white/70' : 'text-slate-400'}`}>{new Date(m.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</div>
                </div>
              </div>
            );
          })}
      </div>
      {err && <p className="px-3 text-[11px] text-rose-400">{err}</p>}
      <form onSubmit={send} className="flex items-center gap-2 p-2 border-t border-mv-hair">
        <input className="mv-input !py-1.5 !text-xs flex-1" placeholder="Nhập tin nhắn…" value={text} onChange={(e) => setText(e.target.value)} data-testid="chat-input" maxLength={4000} />
        <button type="submit" disabled={sending || !text.trim()} className="mv-btn mv-btn-primary !px-3 !py-1.5 disabled:opacity-50" data-testid="chat-send" aria-label="Gửi">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
