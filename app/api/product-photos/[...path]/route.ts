import { PHOTO_PREFIX, UUID } from "@/lib/crm/contracts";
import { failure, requireStaff } from "@/lib/crm/request";
import { BATCH_BUCKET } from "@/lib/crm/uploads";

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { supabase } = await requireStaff(request, false);
    const { path } = await context.params;
    if (path.length !== 3 || !UUID.test(path[0]) || !UUID.test(path[1]) || !UUID.test(path[2].replace(/\.webp$/, "")) || !path[2].endsWith(".webp")) return new Response(null, { status: 404 });
    const name = path.join("/");
    const { data: product, error } = await supabase.from("products").select("id").eq("photoUrl", PHOTO_PREFIX + name).limit(1).maybeSingle();
    if (error || !product) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    const { data, error: downloadError } = await supabase.storage.from(BATCH_BUCKET).download(name);
    if (downloadError || !data) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    return new Response(data, { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return failure(error); }
}
