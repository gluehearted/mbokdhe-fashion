import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { dpAmount, notes } = body;

    const parsedDp = parseInt(String(dpAmount), 10);

    if (isNaN(parsedDp) || parsedDp <= 0) {
      return NextResponse.json(
        { success: false, error: "Nominal DP harus angka positif yang valid." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: existingOrder, error: checkError } = await supabase
      .from("orders")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (checkError) throw checkError;

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: "Order tidak ditemukan." },
        { status: 404 }
      );
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        dpAmount: parsedDp,
        dpDate: new Date().toISOString(),
        status: "DP",
        dpForfeited: false,
        ...(notes && { notes }),
      })
      .eq("id", id)
      .select("*, customer:customers(*), products(*)")
      .single();

    if (updateError) throw updateError;

    const normalized = {
      ...updatedOrder,
      customer: Array.isArray(updatedOrder.customer) ? updatedOrder.customer[0] : updatedOrder.customer || null,
      products: updatedOrder.products || [],
    };

    return NextResponse.json({
      success: true,
      data: normalized,
      message: `DP sebesar Rp ${parsedDp.toLocaleString("id-ID")} berhasil dicatat.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
