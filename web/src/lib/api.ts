export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : 'http://127.0.0.1:8000');

export async function api<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  let response: Response;
  try {
    response = await fetch(fullUrl, {
      ...options,
      signal: options.signal || AbortSignal.timeout(30000),
    });
  } catch (err: any) {
    if (err.name === 'TimeoutError') {
      throw new Error('Yêu cầu xử lý quá lâu. Anh thử lại nhé.');
    }
    throw new Error('Không thể kết nối đến máy chủ backend (Port 8000). Anh kiểm tra lại backend nhé.');
  }

  const rawText = await response.text();
  let data: any = null;

  try {
    data = JSON.parse(rawText);
  } catch {
    if (!response.ok) {
      throw new Error(`Máy chủ báo lỗi (HTTP ${response.status}). Anh kiểm tra lại backend nhé.`);
    }
    data = rawText as unknown as T;
  }

  if (!response.ok) {
    const errorMsg =
      data?.error?.message ||
      data?.detail?.message ||
      data?.detail ||
      `Yêu cầu không thành công (HTTP ${response.status}). Anh thử lại nhé.`;
    throw new Error(errorMsg);
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
