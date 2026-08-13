import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { reason = "Batas waktu DP habis / Batal Hit & Run" } = body;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: existingOrder, error: checkError } = await supabase
      .from("orders")
      .select("*, products(*)")
      .eq("id", id)
      .maybeSingle();

    if (checkError) throw checkError;

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: "Order tidak ditemukan." },
        { status: 404 }
      );
    }

    // 1. Mark order as Dibatalkan and DP as forfeited
    const { data: order, error: updateOrderError } = await supabase
      .from("orders")
      .update({
        status: "Dibatalkan",
        dpForfeited: true,
        notes: `DP Rp ${existingOrder.dpAmount.toLocaleString("id-ID")} HANGUS/FORFEIT. Alasan: ${reason}`,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*, customer:customers(*), products(*)")
      .single();

    if (updateOrderError) throw updateOrderError;

    // 2. Revert products back to "Tersedia" in etalase
    const { error: updateProductsError } = await supabase
      .from("products")
      .update({
        status: "Tersedia",
        orderId: null,
      })
      .eq("orderId", id);

    if (updateProductsError) throw updateProductsError;

    const normalized = {
      ...order,
      customer: Array.isArray(order.customer) ? order.customer[0] : order.customer || null,
      products: order.products || [],
    };

    return NextResponse.json({
      success: true,
      data: normalized,
      message: `DP Rp ${existingOrder.dpAmount.toLocaleString("id-ID")} telah dicatat Hangus (Forfeit). Produk berhasil dikembalikan ke etalase Tersedia.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
