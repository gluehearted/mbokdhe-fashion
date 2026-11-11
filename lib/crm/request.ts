import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { CrmError, PendingBatchError, UUID } from "./contracts";

export async function requireStaff(request: Request, mutation = true, authorizeInRpc = false) {
  if (mutation) {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") {
      throw new CrmError("Asal permintaan tidak diizinkan.", 403);
    }
  }
  const supabase = createClient(await cookies());
  // JWT is verified by Supabase Auth. Never trust role from user_metadata.
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new CrmError("Silakan login kembali.", 401);
  if (authorizeInRpc) return { supabase, user };
  const { data: allowed, error: accessError } = await supabase.rpc("crm_has_access");
  if (accessError) throw new CrmError("Konfigurasi akses CRM belum tersedia. Hubungi pengelola.", 503);
  if (!allowed) throw new CrmError("Akun tidak memiliki akses CRM.", 403);
  return { supabase, user };
}

export function requestKey(request: Request): string {
  const key = request.headers.get("idempotency-key") || "";
  if (!UUID.test(key)) throw new CrmError("Identitas penyimpanan tidak valid.");
  return key.toLowerCase();
}

export function failure(error: unknown, fallback = "Penyimpanan gagal. Silakan coba lagi.") {
  const known = error instanceof CrmError;
  return NextResponse.json({ success: false, error: known ? error.message : fallback, outcomeUnknown: error instanceof PendingBatchError }, {
    status: known ? error.status : 500, headers: { "Cache-Control": "no-store" },
  });
}

export function rpcFailure(error: { code?: string; message?: string }): CrmError {
  if (error.code === "42501") return new CrmError("Akun tidak memiliki akses CRM.", 403);
  if (error.code === "P0001") return new CrmError(error.message || "Data tidak valid.", 409);
  if (error.code === "PGRST202") return new CrmError("Pembaruan database belum terpasang. Hubungi pengelola.", 503);
  return new CrmError("Database belum dapat menyelesaikan penyimpanan. Coba lagi dengan draft yang sama.", 503);
}
