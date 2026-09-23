export const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export async function api<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  const response = await fetch(fullUrl, {
    ...options,
    signal: options.signal || AbortSignal.timeout(330000),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Yêu cầu không thành công. Anh thử lại nhé.');
  }
  return data;
}

export async function pollJob(jobId: string, timeoutMs: number = 600000): Promise<any> {
  const start = Date.now();
  while (true) {
    const job = await api(`/v1/generations/${encodeURIComponent(jobId)}`);
    if (job.status === 'failed') {
      throw new Error(job.error || 'Xử lý thất bại.');
    }
    if (job.status === 'completed') {
      return job;
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error('Thời gian xử lý quá lâu. Anh thử lại nhé.');
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
}
