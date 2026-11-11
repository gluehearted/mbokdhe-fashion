import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { BATCH_BUCKET, cleanupAttempt } from "@/lib/crm/uploads";
import { PHOTO_PREFIX } from "@/lib/crm/contracts";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const expected = Buffer.from(`Bearer ${secret || ""}`);
  const actual = Buffer.from(request.headers.get("authorization") || "");
  if (!secret || expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ success: false, error: "Maintenance belum dikonfigurasi." }, { status: 503 });
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: claimError } = await supabase.rpc("crm_claim_upload_cleanup_admin");
    if (claimError) throw claimError;
    const { data: attempts, error: attemptsError } = await supabase.from("crm_upload_attempts").select("id").eq("state", "cleanup").limit(100);
    if (attemptsError) throw attemptsError;
    for (const attempt of attempts || []) await cleanupAttempt(supabase, attempt.id);

    // Retain the existing sold-photo retention period. Only update the reference if deletion succeeds.
    const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 3);
    const { data: products, error } = await supabase.from("products").select("id,photoUrl").eq("status", "Terjual").lt("updatedAt", cutoff.toISOString()).neq("photoUrl", "/uploads/placeholder.jpg").order("updatedAt").limit(100);
    if (error) throw error;
    let cleanedCount = 0;
    for (const product of products || []) {
      let bucket: string, path: string;
      if (product.photoUrl?.startsWith(PHOTO_PREFIX)) { bucket = BATCH_BUCKET; path = product.photoUrl.slice(PHOTO_PREFIX.length); }
      else if (product.photoUrl?.includes("/storage/v1/object/public/products/")) { bucket = "products"; path = product.photoUrl.split("/storage/v1/object/public/products/")[1]; }
      else continue;
      const { error: removeError } = await supabase.storage.from(bucket).remove([path]);
      if (removeError) throw removeError;
      const { error: updateError } = await supabase.from("products").update({ photoUrl: "/uploads/placeholder.jpg" }).eq("id", product.id).eq("photoUrl", product.photoUrl);
      if (updateError) throw updateError;
      cleanedCount++;
    }
    // Also collect private photos replaced/deleted since a committed batch, after a 24h grace period.
    const { data: oldAttempts, error: oldError } = await supabase.from("crm_upload_attempts").select("id,paths").eq("state", "committed").neq("paths", "{}").lt("expires_at", new Date(Date.now() - 86400000).toISOString()).order("expires_at").limit(10);
    if (oldError) throw oldError;
    for (const attempt of oldAttempts || []) {
      const paths = attempt.paths as string[];
      const { data: references, error: referenceError } = await supabase.from("products").select("photoUrl").in("photoUrl", paths.map(path => PHOTO_PREFIX + path));
      if (referenceError) throw referenceError;
      const active = new Set((references || []).map(row => row.photoUrl.slice(PHOTO_PREFIX.length)));
      const orphans = paths.filter(path => !active.has(path));
      if (orphans.length) {
        const { error: orphanError } = await supabase.storage.from(BATCH_BUCKET).remove(orphans);
        if (orphanError) throw orphanError;
      }
      // Advance the sweep so referenced paths cannot starve later batches.
      const { error: sweepError } = await supabase.from("crm_upload_attempts").update({ paths: [...active], expires_at: new Date().toISOString() }).eq("id", attempt.id).eq("state", "committed");
      if (sweepError) throw sweepError;
    }
    return NextResponse.json({ success: true, cleanedCount, recoveredAttempts: attempts?.length || 0 }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: "Maintenance belum selesai. Pekerjaan akan dicoba ulang." }, { status: 503 });
  }
}
