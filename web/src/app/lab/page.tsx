'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FlaskConical, Send, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function LabPage() {
  const [endpoint, setEndpoint] = useState('/v1/creative/marketing');
  const [payload, setPayload] = useState(
    JSON.stringify(
      {
        industry: 'recruitment',
        name: 'Senior Frontend Developer',
        details: '3 năm kinh nghiệm React, Next.js, Tailwind\nLương 20-30 triệu',
        brand: 'Mivy',
        offer: 'Lương 20-30 triệu',
      },
      null,
      2
    )
  );
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResponse('Đang gửi request tới backend…');

    try {
      const data = await api(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      setResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setResponse(`ERROR: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] p-6 lg:p-12">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/studio"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Studio</span>
          </Link>
          <span className="text-xs px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-emerald-400 font-mono">
            API LAB · DEVELOPER MODE
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-emerald-400" />
            <span>Phòng Thử Nghiệm API Trực Tiếp</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gửi payload JSON trực tiếp tới các endpoint của FastAPI backend để kiểm tra phản hồi.
          </p>
        </div>

        <form onSubmit={handleTest} className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/30">
              POST
            </span>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors disabled:opacity-50"
            >
              <Send className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Gửi Request</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Payload JSON</label>
            <textarea
              rows={8}
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-black/50 border border-white/10 text-emerald-400 font-mono text-xs focus:outline-none focus:border-emerald-500 leading-relaxed"
            />
          </div>

          {response && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Kết quả phản hồi (Response)</label>
              <pre className="p-4 rounded-xl bg-black/70 border border-white/10 text-slate-300 font-mono text-xs overflow-x-auto max-h-96 leading-relaxed">
                {response}
              </pre>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
