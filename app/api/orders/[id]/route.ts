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
    let { status, trackingNo, shippingCourier, shippingService, shippingCost, dpAmount, totalPrice, notes, productIds, products } = body;

    // Map status string if provided in English
    if (status === "Keep") status = "Keep";
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

    // 1. Synchronize Product Items if productIds is provided
    if (Array.isArray(productIds)) {
      const currentProducts: any[] = existingOrder.products || [];
      const currentProductIds = currentProducts.map((p: any) => p.id);

      // Removed products -> revert status to Tersedia and unlink orderId
      const removedIds = currentProductIds.filter((pid: string) => !productIds.includes(pid));
      if (removedIds.length > 0) {
        const { error: unlinkError } = await supabase
          .from("products")
          .update({
            status: "Tersedia",
            orderId: null,
          })
          .in("id", removedIds);
        if (unlinkError) throw unlinkError;
      }

      // Added or updated products -> link to this orderId
      const addedIds = productIds.filter((pid: string) => !currentProductIds.includes(pid));
      if (addedIds.length > 0) {
        const newProductStatus = (status === "Dikirim" || status === "Shipped") ? "Terjual" : "Dibooking";
        const { error: linkError } = await supabase
          .from("products")
          .update({
            status: newProductStatus,
            orderId: id,
          })
          .in("id", addedIds);
        if (linkError) throw linkError;
      }

      // Update prices for individual products if provided in products array
      if (Array.isArray(products)) {
        for (const item of products) {
          if (item.productId && item.customPrice !== undefined) {
            await supabase
              .from("products")
              .update({ price: item.customPrice })
              .eq("id", item.productId);
          }
        }
      }
    }

    // 2. Handle Status changes
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
        ...(notes !== undefined && { notes: notes ? String(notes).trim() : null }),
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

export async function DELETE(
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
        { success: false, error: "Pesanan tidak ditemukan." },
        { status: 404 }
      );
    }

    // Kembalikan seluruh tas/produk yang terkait dengan pesanan ini ke status 'Tersedia'
    const { error: prodError } = await supabase
      .from("products")
      .update({
        status: "Tersedia",
        orderId: null,
      })
      .eq("orderId", id);

    if (prodError) throw prodError;

    // Hapus data pesanan dari database
    const { error: deleteError } = await supabase
      .from("orders")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      message: `Pesanan #${id.slice(0, 8)} berhasil dihapus dan produk terkait telah dikembalikan ke status 'Tersedia'.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
