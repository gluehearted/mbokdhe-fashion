import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

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

    // Update order status to "Siap Kirim"
    const { data: order, error: updateOrderError } = await supabase
      .from("orders")
      .update({
        status: "Siap Kirim",
        notes: `Lunas pada ${new Date().toLocaleDateString("id-ID")}`,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*, customer:customers(*), products(*)")
      .single();

    if (updateOrderError) throw updateOrderError;

    // Mark attached products as "Terjual"
    const { error: updateProductsError } = await supabase
      .from("products")
      .update({
        status: "Terjual",
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
      message: `Pesanan ID ${id} berhasil dilunasi and masuk antrean Siap Kirim.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
