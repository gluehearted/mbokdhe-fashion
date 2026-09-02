import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    // 1. Verifikasi keamanan (via Vercel Cron User-Agent atau CRON_SECRET)
    const authHeader = request.headers.get("authorization");
    const isVercelCron = request.headers.get("user-agent")?.includes("vercel-cron");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !isVercelCron) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Kredensial Supabase tidak ditemukan.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Dapatkan produk "Terjual" > 3 bulan yang lalu
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: products, error: fetchError } = await supabase
      .from("products")
      .select("id, photoUrl")
      .eq("status", "Terjual")
      .lt("createdAt", threeMonthsAgo.toISOString());

    if (fetchError) throw fetchError;

    if (!products || products.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Tidak ada foto produk terjual > 3 bulan yang perlu dibersihkan.",
        cleanedCount: 0,
        executedAt: new Date().toISOString(),
      });
    }

    // 3. Kumpulkan file untuk di-bulk delete
    const productIdsToUpdate: string[] = [];
    const supabaseFilesToRemove: string[] = [];

    for (const p of products) {
      if (p.photoUrl && !p.photoUrl.includes("placeholder")) {
        productIdsToUpdate.push(p.id);

        if (p.photoUrl.includes("supabase.co")) {
          const urlParts = p.photoUrl.split("/products/");
          if (urlParts.length > 1) {
            supabaseFilesToRemove.push(urlParts[1]);
          }
        }
      }
    }

    if (productIdsToUpdate.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Tidak ada file foto fisik yang perlu dibersihkan.",
        cleanedCount: 0,
        executedAt: new Date().toISOString(),
      });
    }

    // 4. Bulk Delete dari Supabase Storage
    if (supabaseFilesToRemove.length > 0) {
      const { error: storageError } = await supabase
        .storage
        .from("products")
        .remove(supabaseFilesToRemove);

      if (storageError) {
        console.warn("Storage bulk delete warning:", storageError);
      }
    }

    // 5. Bulk Update URL foto di database ke placeholder
    const { error: updateError } = await supabase
      .from("products")
      .update({ photoUrl: "/uploads/placeholder.jpg" })
      .in("id", productIdsToUpdate);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: `Pembersihan otomatis sukses. ${productIdsToUpdate.length} foto produk lama berhasil dibersihkan.`,
      cleanedCount: productIdsToUpdate.length,
      executedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Cron Cleanup Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
