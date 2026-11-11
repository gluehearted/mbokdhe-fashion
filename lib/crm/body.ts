import { CrmError } from "./contracts";

export async function readBody(request: Request, maxBytes: number): Promise<Buffer> {
  if (Number(request.headers.get("content-length")) > maxBytes) throw new CrmError("Data permintaan terlalu besar.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new CrmError("Data permintaan kosong.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) { await reader.cancel(); throw new CrmError("Data permintaan terlalu besar.", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}

export async function readForm(request: Request, maxBytes: number): Promise<FormData> {
  try {
    return await new Response(new Uint8Array(await readBody(request, maxBytes)), { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData();
  } catch (error) {
    if (error instanceof CrmError) throw error;
    throw new CrmError("Format unggahan tidak valid.");
  }
}
