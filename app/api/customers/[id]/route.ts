import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

// GET /api/customers/[id]
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: customer, error } = await supabase
      .from("customers")
      .select("*, orders(*, products(*))")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Pelanggan tidak ditemukan." },
        { status: 404 }
      );
    }

    // Sort orders in memory & compute totalSpending / totalTransactions
    if (customer.orders && Array.isArray(customer.orders)) {
      customer.orders.sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const validOrders = customer.orders.filter((o: any) => {
        const st = o.status;
        return (
          st === "Siap Kirim" ||
          st === "Siap_Kirim" ||
          st === "Siap Packing" ||
          st === "Dikirim" ||
          st === "Shipped"
        );
      });

      customer.totalTransactions = validOrders.length;
      customer.totalSpending = validOrders.reduce((sum: number, o: any) => {
        let computed = o.totalPrice || 0;
        if (o.products && Array.isArray(o.products) && o.products.length > 0) {
          const itemNet = o.products.reduce(
            (pSum: number, p: any) => pSum + Math.max(0, (p.price || 0) - (p.discount || 0)),
            0
          );
          computed = itemNet + (o.shippingCost || 0);
        }
        return sum + computed;
      }, 0);
    }

    return NextResponse.json({
      success: true,
      data: customer,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// PATCH /api/customers/[id]
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const {
      name,
      whatsapp,
      domisili,
      shippingCost,
      courier,
      addressDetail,
      behavioral,
      consumerType,
      relationshipStatus,
      crisisStatus,
      totalSpending,
      totalTransactions,
    } = body;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: existing, error: checkExistingError } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (checkExistingError) throw checkExistingError;

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Pelanggan tidak ditemukan." },
        { status: 404 }
      );
    }

    let cleanWhatsapp: string | undefined;
    if (whatsapp) {
      cleanWhatsapp = String(whatsapp).trim().replace(/[^0-9]/g, "");
      if (cleanWhatsapp !== existing.whatsapp) {
        const { data: checkWa, error: checkWaError } = await supabase
          .from("customers")
          .select("id")
          .eq("whatsapp", cleanWhatsapp)
          .maybeSingle();
        if (checkWaError) throw checkWaError;
        if (checkWa) {
          return NextResponse.json(
            { success: false, error: `Nomor WhatsApp ${cleanWhatsapp} sudah digunakan pelanggan lain.` },
            { status: 400 }
          );
        }
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("customers")
      .update({
        ...(name && { name: name.trim() }),
        ...(cleanWhatsapp && { whatsapp: cleanWhatsapp }),
        ...(domisili !== undefined && { domisili: domisili ? domisili.trim() : null }),
        ...(shippingCost !== undefined && { shippingCost: parseInt(String(shippingCost), 10) }),
        ...(courier !== undefined && { courier: courier ? courier.trim() : null }),
        ...(addressDetail && { addressDetail: addressDetail.trim() }),
        ...(behavioral !== undefined && { behavioral: behavioral ? behavioral.trim() : null }),
        ...(consumerType !== undefined && { consumerType: consumerType ? consumerType.trim() : null }),
        ...(relationshipStatus !== undefined && { relationshipStatus: relationshipStatus ? relationshipStatus.trim() : null }),
        ...(crisisStatus !== undefined && { crisisStatus: crisisStatus ? crisisStatus.trim() : null }),
        ...(totalSpending !== undefined && { totalSpending: parseInt(String(totalSpending), 10) }),
        ...(totalTransactions !== undefined && { totalTransactions: parseInt(String(totalTransactions), 10) }),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// DELETE /api/customers/[id]
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: customer, error: fetchError } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Pelanggan tidak ditemukan." },
        { status: 404 }
      );
    }

    // Cascade deletion
    const { data: orders, error: fetchOrdersError } = await supabase
      .from("orders")
      .select("id")
      .eq("customerId", id);

    if (fetchOrdersError) throw fetchOrdersError;

    const orderIds = (orders || []).map((o) => o.id);

    if (orderIds.length > 0) {
      // Unlink products, set status back to "Tersedia"
      const { error: unlinkError } = await supabase
        .from("products")
        .update({
          orderId: null,
          status: "Tersedia",
        })
        .in("orderId", orderIds);

      if (unlinkError) throw unlinkError;

      // Delete all orders for this customer
      const { error: deleteOrdersError } = await supabase
        .from("orders")
        .delete()
        .eq("customerId", id);

      if (deleteOrdersError) throw deleteOrdersError;
    }

    // Delete customer record
    const { error: deleteCustomerError } = await supabase
      .from("customers")
      .delete()
      .eq("id", id);

    if (deleteCustomerError) throw deleteCustomerError;

    return NextResponse.json({
      success: true,
      message: `Pelanggan '${customer.name}' beserta seluruh riwayat pesanan berhasil dihapus (produk dikembalikan ke etalase Tersedia).`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
