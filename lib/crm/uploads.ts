import type { SupabaseClient } from "@supabase/supabase-js";

export const BATCH_BUCKET = "product-batches";

export async function cleanupAttempt(supabase: SupabaseClient, attemptId: string) {
  const { data, error } = await supabase.from("crm_upload_attempts").select("id,paths,state").eq("id", attemptId).eq("state", "cleanup").maybeSingle();
  if (error) throw error;
  if (!data) return;
  if (data.paths.length) {
    const { error: removeError } = await supabase.storage.from(BATCH_BUCKET).remove(data.paths);
    if (removeError) throw removeError;
  }
  const { error: markError } = await supabase.from("crm_upload_attempts").update({ state: "cleaned" }).eq("id", data.id).eq("state", "cleanup");
  if (markError) throw markError;
}

export async function recoverUploads(supabase: SupabaseClient) {
  const { error } = await supabase.rpc("crm_claim_expired_uploads");
  if (error) throw error;
  const { data, error: listError } = await supabase.from("crm_upload_attempts").select("id").eq("state", "cleanup").limit(20);
  if (listError) throw listError;
  for (const row of data || []) await cleanupAttempt(supabase, row.id);
}
