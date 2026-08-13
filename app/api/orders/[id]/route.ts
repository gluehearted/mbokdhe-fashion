import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    let { status, trackingNo, shippingCourier, shippingService, shippingCost, dpAmount, totalPrice } = body;

    // Map status string if provided in English
    if (status === "Keep") status = "Menunggu";
    if (status === "Siap_Packing" || status === "Siap_Kirim" || status === "Siap Packing") status = "Siap Kirim";
    if (status === "Shipped") status = "Dikirim";
    if (status === "Cancelled") status = "Dibatalkan";

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
        { success: false, error: "Pesanan tidak ditemukan." },
        { status: 404 }
      );
    }

    // If status is changed to Dibatalkan/Cancelled, revert all linked products to Tersedia
    if (status === "Dibatalkan" || status === "Cancelled") {
      const { error: prodError } = await supabase
        .from("products")
        .update({
          status: "Tersedia",
          orderId: null,
        })
        .eq("orderId", id);
      if (prodError) throw prodError;
    } else if (status === "Dikirim" || status === "Shipped") {
      // If status changed to Dikirim, products become Terjual
      const { error: prodError } = await supabase
        .from("products")
        .update({
          status: "Terjual",
        })
        .eq("orderId", id);
      if (prodError) throw prodError;
    }

    const { data: order, error: updateError } = await supabase
      .from("orders")
      .update({
        ...(status && { status }),
        ...(trackingNo !== undefined && { trackingNo }),
        ...(shippingCourier !== undefined && { shippingCourier }),
        ...(shippingService !== undefined && { shippingService }),
        ...(shippingCost !== undefined && { shippingCost: parseInt(String(shippingCost), 10) }),
        ...(dpAmount !== undefined && { dpAmount: parseInt(String(dpAmount), 10) }),
        ...(totalPrice !== undefined && { totalPrice: parseInt(String(totalPrice), 10) }),
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*, customer:customers(*), products(*)")
      .single();

    if (updateError) throw updateError;

    const normalized = {
      ...order,
      customer: Array.isArray(order.customer) ? order.customer[0] : order.customer || null,
      products: order.products || [],
    };

    return NextResponse.json({
      success: true,
      data: normalized,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: order, error } = await supabase
      .from("orders")
      .select("*, customer:customers(*), products(*)")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Pesanan tidak ditemukan." },
        { status: 404 }
      );
    }

    const normalized = {
      ...order,
      customer: Array.isArray(order.customer) ? order.customer[0] : order.customer || null,
      products: order.products || [],
    };

    return NextResponse.json({
      success: true,
      data: normalized,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
