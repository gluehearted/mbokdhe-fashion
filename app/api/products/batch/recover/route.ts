import { NextResponse } from "next/server";
import { requireStaff, failure } from "@/lib/crm/request";
import { recoverUploads } from "@/lib/crm/uploads";

export async function POST(request: Request) {
  try {
    const { supabase } = await requireStaff(request);
    await recoverUploads(supabase);
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error, "Pembersihan belum selesai. Data produk tidak diubah."); }
}
