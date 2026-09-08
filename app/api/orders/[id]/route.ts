import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

interface OrderProduct {
  id: string;
  price?: number;
  discount?: number;
  shop?: unknown;
  [key: string]: unknown;
}

interface ProductItemInput {
  productId?: string;
  customPrice?: number;
  discount?: number;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    let { status } = body;
    const {
      customerId,
      trackingNo,
      courier,
      shippingCourier,
      shippingService,
      shippingCost,
      dpAmount,
      totalPrice,
      notes,
      productIds,
      products,
    } = body;
    const finalCourier = courier || shippingCourier;

    // 🔥 MAP STATUS BEBAS
    if (status) {
      if (status === "Siap_Packing" || status === "Siap_Kirim" || status === "Siap Packing") status = "Siap Kirim";
      if (status === "Shipped") status = "Dikirim";
      if (status === "Cancelled") status = "Dibatalkan";
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: existingOrder, error: checkError } = await supabase
      .from("orders")
      .select("*, products(*)")
      .eq("id", id)
      .maybeSingle();

    if (checkError) throw checkError;

    if (!existingOrder) {
      return NextResponse.json({ success: false, error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    // 1. Sinkronisasi Item Produk (jika ada perubahan dari form edit)
    if (Array.isArray(productIds)) {
      const currentProducts: OrderProduct[] = existingOrder.products || [];
      const currentProductIds = currentProducts.map((p) => p.id);

      const removedIds = currentProductIds.filter((pid: string) => !productIds.includes(pid));
      if (removedIds.length > 0) {
        await supabase.from("products").update({
          status: "Tersedia",
          orderId: null,
          updatedAt: new Date().toISOString(),
        }).in("id", removedIds);
      }

      const addedIds = productIds.filter((pid: string) => !currentProductIds.includes(pid));
      if (addedIds.length > 0) {
        const newProductStatus = (status === "Dikirim" || status === "Shipped") ? "Terjual" : "Dibooking";
        await supabase.from("products").update({
          status: newProductStatus,
          orderId: id,
          updatedAt: new Date().toISOString(),
        }).in("id", addedIds);
      }

      if (Array.isArray(products)) {
        for (const item of (products as ProductItemInput[])) {
          if (item.productId && (item.customPrice !== undefined || item.discount !== undefined)) {
            const updateData: Record<string, unknown> = {};
            if (item.customPrice !== undefined) updateData.price = item.customPrice;
            if (item.discount !== undefined) updateData.discount = item.discount;
            await supabase.from("products").update(updateData).eq("id", item.productId);
          }
        }
      }
    }

    // 2. Handle Perubahan Status untuk Produk yang tertaut
    if (status === "Dibatalkan" || status === "Cancelled") {
      await supabase.from("products").update({
        status: "Tersedia",
        orderId: null,
        updatedAt: new Date().toISOString(),
      }).eq("orderId", id);
    } else if (status === "Dikirim" || status === "Shipped") {
      await supabase.from("products").update({
        status: "Terjual",
        updatedAt: new Date().toISOString(),
      }).eq("orderId", id);
    } else if (status) {
      await supabase.from("products").update({
        status: "Dibooking",
        updatedAt: new Date().toISOString(),
      }).eq("orderId", id);
    }

    // 🔥 OTOMATISASI DP BERDASARKAN ASUMSI (BUSINESS RULE)
    const finalTotalPrice = totalPrice !== undefined && totalPrice !== null ? parseInt(String(totalPrice), 10) : existingOrder.totalPrice;
    let finalDpAmount = dpAmount !== undefined && dpAmount !== null ? parseInt(String(dpAmount), 10) : existingOrder.dpAmount;

    // Jika admin set "Keep (Lunas)", otomatiskan DP = Total Harga
    if (status === "Keep (Lunas)") {
      finalDpAmount = finalTotalPrice;
    } 
    // Jika admin set "Keep (Belum Bayar)" atau "Menunggu", pastikan DP = 0
    else if (status === "Keep (Belum Bayar)" || status === "Menunggu") {
      finalDpAmount = 0;
    }

    const finalShippingCost = shippingCost !== undefined && shippingCost !== null ? parseInt(String(shippingCost), 10) : undefined;

    // 3. Update Database Order
    const { data: order, error: updateError } = await supabase
      .from("orders")
      .update({
        ...(customerId !== undefined && { customerId }),
        ...(status && { status }),
        ...(trackingNo !== undefined && { trackingNo }),
        ...(finalCourier !== undefined && { shippingCourier: finalCourier }),
        ...(shippingService !== undefined && { shippingService }),
        ...(finalShippingCost !== undefined && !isNaN(finalShippingCost) && { shippingCost: finalShippingCost }),
        dpAmount: finalDpAmount, // Selalu update nilai DP sesuai aturan baru
        totalPrice: finalTotalPrice,
        ...(notes !== undefined && { notes: notes ? String(notes).trim() : null }),
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*, customer:customers(*), products(*)")
      .single();

    if (updateError) throw updateError;

    // Hitung ulang untuk respon ke Frontend
    const orderProducts = (order.products || []).map((p: OrderProduct) => ({
      ...p,
      shop: Array.isArray(p.shop) ? p.shop[0] : p.shop || null,
    }));

    let calculatedTotalPrice = order.totalPrice || 0;
    if (orderProducts.length > 0) {
      const itemNetTotal = orderProducts.reduce(
        (sum: number, p: OrderProduct) => sum + Math.max(0, (p.price || 0) - (p.discount || 0)), 0
      );
      calculatedTotalPrice = itemNetTotal + (order.shippingCost || 0);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        customer: Array.isArray(order.customer) ? order.customer[0] : order.customer || null,
        products: orderProducts,
        totalPrice: calculatedTotalPrice,
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error("Orders PATCH Error:", err.message || err);
    return NextResponse.json({ success: false, error: err.message || "Internal Server Error" }, { status: 500 });
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
    if (!order) return NextResponse.json({ success: false, error: "Pesanan tidak ditemukan." }, { status: 404 });

    const products = (order.products || []).map((p: OrderProduct) => ({
      ...p,
      shop: Array.isArray(p.shop) ? p.shop[0] : p.shop || null,
    }));

    let calculatedTotalPrice = order.totalPrice || 0;
    if (products.length > 0) {
      const itemNetTotal = products.reduce(
        (sum: number, p: OrderProduct) => sum + Math.max(0, (p.price || 0) - (p.discount || 0)), 0
      );
      calculatedTotalPrice = itemNetTotal + (order.shippingCost || 0);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        customer: Array.isArray(order.customer) ? order.customer[0] : order.customer || null,
        products,
        totalPrice: calculatedTotalPrice,
      },
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
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
    if (!existingOrder) return NextResponse.json({ success: false, error: "Pesanan tidak ditemukan." }, { status: 404 });

    const { error: prodError } = await supabase
      .from("products")
      .update({ status: "Tersedia", orderId: null, updatedAt: new Date().toISOString() })
      .eq("orderId", id);

    if (prodError) throw prodError;

    const { error: deleteError } = await supabase.from("orders").delete().eq("id", id);
    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      message: `Pesanan #${id.slice(0, 8)} berhasil dihapus.`,
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

