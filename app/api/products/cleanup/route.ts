import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    // 1. Panggil supabase client yang benar dengan cookieStore
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Cek apakah user sedang login
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // 2. Dapatkan semua produk "Terjual" > 3 bulan yang lalu
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
      });
    }

    // 3. Pisahkan tugas untuk BULK ACTION (Aksi Massal)
    const productIdsToUpdate: string[] = [];
    const supabaseFilesToRemove: string[] = [];

    for (const p of products) {
      if (p.photoUrl && !p.photoUrl.includes("placeholder")) {
        productIdsToUpdate.push(p.id);

        if (p.photoUrl.includes("supabase.co")) {
          const urlParts = p.photoUrl.split("/products/");
          if (urlParts.length > 1) {
            supabaseFilesToRemove.push(urlParts[1]); // Kumpulkan path file-nya
          }
        }
      }
    }

    if (productIdsToUpdate.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Tidak ada foto yang perlu dibersihkan.",
        cleanedCount: 0,
      });
    }

    // 4. EKSEKUSI BULK DELETE STORAGE (Hapus puluhan file dalam 1 kali tembak)
    if (supabaseFilesToRemove.length > 0) {
      const { error: storageError } = await supabase
        .storage
        .from("products")
        .remove(supabaseFilesToRemove);

      if (storageError) {
        console.warn("Bulk delete storage error:", storageError);
      }
    }

    // 5. EKSEKUSI BULK UPDATE DATABASE (Update puluhan baris dalam 1 kali tembak)
    const { error: updateError } = await supabase
      .from("products")
      .update({ photoUrl: "/uploads/placeholder.jpg" })
      .in("id", productIdsToUpdate);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: `Pembersihan sukses. Sebanyak ${productIdsToUpdate.length} foto lama dihapus & URL direset massal.`,
      cleanedCount: productIdsToUpdate.length,
    });

  } catch (error: any) {
    console.error("Cleanup Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
