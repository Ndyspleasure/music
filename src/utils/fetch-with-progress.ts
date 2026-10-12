export interface FetchProgressOptions {
  signal?: AbortSignal;
  onProgress?: (fraction: number) => void;
}

/** Unduh file biner dengan laporan progres (bila server mengirim Content-Length). */
export async function fetchWithProgress(url: string, opts: FetchProgressOptions = {}): Promise<ArrayBuffer> {
  const res = await fetch(url, { signal: opts.signal });
  if (!res.ok) throw new Error(`Gagal mengunduh ${url} (HTTP ${res.status})`);
  const total = Number(res.headers.get("content-length")) || 0;
  if (!res.body || !total) {
    const buf = await res.arrayBuffer();
    opts.onProgress?.(1);
    return buf;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    opts.onProgress?.(Math.min(1, received / total));
  }
  const out = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  opts.onProgress?.(1);
  return out.buffer;
}
