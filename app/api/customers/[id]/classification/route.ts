import { NextResponse } from "next/server";
import { requireStaff, failure } from "@/lib/crm/request";
import { readBody } from "@/lib/crm/body";
import { CrmError, text } from "@/lib/crm/contracts";
import { parseClassificationChange } from "@/lib/crm/customer-classification";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireStaff(request);
    const id = text((await context.params).id, 200, "ID pelanggan", true);
    let body: unknown;
    try { body = JSON.parse((await readBody(request, 16 * 1024)).toString()); }
    catch (error) { if (error instanceof CrmError) throw error; throw new CrmError("Format data tidak valid."); }
    const { field, value, expectedValue } = parseClassificationChange(body);
    let query = supabase.from("customers").update({ [field]: value }).eq("id", id);
    // One atomic conditional UPDATE protects against two admins overwriting the same field.
    query = expectedValue === null ? query.is(field, null) : query.eq(field, expectedValue);
    const { data, error } = await query.select("id,behavioral,relationshipStatus").maybeSingle();
    if (error) throw error;
    if (data) return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "no-store" } });
    const { data: current, error: readError } = await supabase.from("customers").select("id,behavioral,relationshipStatus").eq("id", id).maybeSingle();
    if (readError) throw readError;
    if (!current) throw new CrmError("Pelanggan tidak ditemukan.", 404);
    // A retry after a lost response is safe when the requested value is already present.
    if (current[field] === value) return NextResponse.json({ success: true, data: current }, { headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ success: false, error: "Data telah diubah admin lain. Nilai terbaru dimuat; silakan pilih kembali.", data: current }, { status: 409, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error, "Perubahan pelanggan gagal disimpan. Silakan coba kembali."); }
}
