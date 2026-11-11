import { readForm } from "@/lib/crm/body";
import { createHash } from "node:crypto";
import { sanitizePhoto } from "@/lib/crm/image";
import { NextResponse } from "next/server";
import { CrmError, MAX_BATCH_BYTES, MAX_PHOTO_BYTES, parseBatch } from "@/lib/crm/contracts";
import { failure, requireStaff, requestKey, rpcFailure } from "@/lib/crm/request";
import { saveBatch, uploadAll, type PreparedBatch } from "@/lib/crm/batch-workflow";
import { BATCH_BUCKET, cleanupAttempt, recoverUploads } from "@/lib/crm/uploads";
import type { Product } from "@/components/forms/ProductForm";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireStaff(request);
    const key = requestKey(request);
    const form = await readForm(request, MAX_BATCH_BYTES);
    const manifest = form.get("manifest");
    if (typeof manifest !== "string") throw new CrmError("Manifest batch tidak valid.");
    let parsed: unknown;
    try { parsed = JSON.parse(manifest); } catch { throw new CrmError("Manifest batch tidak valid."); }
    const payload = parseBatch(parsed);
    const photos = new Map<string, Buffer>();
    const expected = new Set(["manifest", ...payload.items.filter(i => i.hasPhoto).map(i => `photo:${i.draftId}`)]);
    if ([...form.keys()].some(k => !expected.has(k)) || [...expected].some(k => form.getAll(k).length !== 1)) throw new CrmError("Berkas foto tidak cocok dengan draft.");
    for (const item of payload.items) {
      if (!item.hasPhoto) continue;
      const file = form.get(`photo:${item.draftId}`);
      if (!(file instanceof File) || !file.size || file.size > MAX_PHOTO_BYTES) throw new CrmError("Foto maksimal 160 KB. Kompres ulang foto sebelum menyimpan.");
      const bytes = Buffer.from(await file.arrayBuffer());
      photos.set(item.draftId, await sanitizePhoto(bytes));
      item.fileHash = createHash("sha256").update(bytes).digest("hex");
    }
    const fingerprint = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
    const prepare = async () => {
      const { data, error } = await supabase.rpc("crm_prepare_product_batch", { p_key: key, p_payload: payload, p_fingerprint: fingerprint });
      if (error) throw rpcFailure(error);
      return data as PreparedBatch<Product[]>;
    };
    // Best effort; persistent rows allow the next request or recovery endpoint to retry cleanup.
    try { await recoverUploads(supabase); } catch {}
    const data = await saveBatch<Product[]>({
      prepare,
      upload: async (attemptId) => uploadAll([...photos], async ([draftId, bytes]) => {
        const path = `${user.id}/${attemptId}/${draftId}.webp`;
        const { error } = await supabase.storage.from(BATCH_BUCKET).upload(path, bytes, { contentType: "image/webp", upsert: false });
        if (error) throw new CrmError("Satu foto gagal diunggah. Seluruh batch dibatalkan; draft tetap tersedia.", 503);
      }),
      commit: async (attemptId) => {
        const { data, error } = await supabase.rpc("crm_commit_product_batch", { p_key: key, p_attempt: attemptId });
        if (error) throw rpcFailure(error);
        return data as Product[];
      },
      fail: async (attemptId) => {
        const { data, error } = await supabase.rpc("crm_fail_product_batch", { p_key: key, p_attempt: attemptId });
        if (error) throw error;
        return data as "committed" | "failed";
      },
      recover: async () => {
        const result = await prepare();
        if (result.status !== "committed") throw new CrmError("Status batch belum terkonfirmasi. Coba kembali.", 503);
        return result.result!;
      },
      cleanup: (attemptId) => cleanupAttempt(supabase, attemptId),
    });
    return NextResponse.json({ success: true, data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error, "Batch gagal diproses. Draft tetap tersedia untuk dicoba lagi."); }
}
