import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");

    const whereClause: any = {};
    if (status) {
      if (status === "Keep") whereClause.status = "Menunggu";
      else if (status === "Siap_Packing") whereClause.status = "Siap Packing";
      else if (status === "Shipped") whereClause.status = "Dikirim";
      else if (status === "Cancelled") whereClause.status = "Dibatalkan";
      else whereClause.status = status;
    }
    if (customerId) whereClause.customerId = customerId;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    let query = supabase
      .from("orders")
      .select("*, customer:customers(*), products(*)")
      .order("createdAt", { ascending: false });

    if (whereClause.status) {
      query = query.eq("status", whereClause.status);
    }
    if (whereClause.customerId) {
      query = query.eq("customerId", whereClause.customerId);
    }

    const { data: orders, error } = await query;

    if (error) throw error;

    const mapped = (orders || []).map((o: any) => ({
      ...o,
      customer: Array.isArray(o.customer) ? o.customer[0] : o.customer || null,
      products: o.products || [],
    }));

    return NextResponse.json({
      success: true,
      data: mapped,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let {
      customerId,
      customerData,
      productIds,
      customPrices,
      status = "Menunggu",
      shippingCourier,
      shippingService,
      shippingCost = 0,
      totalWeightGram = 1000,
      dpAmount = 0,
      trackingNo,
      notes,
    } = body;

    // Map legacy status strings to Indonesian equivalents
    if (status === "Keep") status = "Menunggu";
    if (status === "Siap_Packing" || status === "Siap_Kirim" || status === "Siap Packing") status = "Siap Kirim";
    if (status === "Shipped") status = "Dikirim";
    if (status === "Cancelled") status = "Dibatalkan";

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pilih minimal 1 produk untuk membuat order." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    let finalCustomerId = customerId;

    if (!finalCustomerId && customerData) {
      const cleanWa = String(customerData.whatsapp).trim().replace(/[^0-9]/g, "");
      
      const { data: existingCustomer, error: findCustError } = await supabase
        .from("customers")
        .select("id")
        .eq("whatsapp", cleanWa)
        .maybeSingle();

      if (findCustError) throw findCustError;

      if (existingCustomer) {
        const { data: updatedCustomer, error: updateCustError } = await supabase
          .from("customers")
          .update({
            name: customerData.name,
            addressDetail: customerData.addressDetail,
            domisili: customerData.domisili || null,
          })
          .eq("id", existingCustomer.id)
          .select()
          .single();

        if (updateCustError) throw updateCustError;
        finalCustomerId = existingCustomer.id;
      } else {
        const newCustId = customerData.id || `CST-${Date.now()}`;
        const { data: newCustomer, error: createCustError } = await supabase
          .from("customers")
          .insert({
            id: newCustId,
            name: customerData.name,
            whatsapp: cleanWa,
            addressDetail: customerData.addressDetail,
            domisili: customerData.domisili || null,
          })
          .select()
          .single();

        if (createCustError) throw createCustError;
        finalCustomerId = newCustId;
      }
    }

    if (!finalCustomerId) {
      return NextResponse.json(
        { success: false, error: "Pelanggan (Customer) wajib dipilih atau diisi datanya." },
        { status: 400 }
      );
    }

    if (customPrices && typeof customPrices === "object") {
      for (const pId of productIds) {
        if (customPrices[pId] !== undefined) {
          const newPrice = parseInt(String(customPrices[pId]), 10);
          if (!isNaN(newPrice) && newPrice >= 0) {
            const { data: pOrig, error: pOrigError } = await supabase
              .from("products")
              .select("price")
              .eq("id", pId)
              .maybeSingle();
            if (pOrigError) throw pOrigError;
            const discAmount = pOrig ? Math.max(0, pOrig.price - newPrice) : 0;
            const { error: pUpdateError } = await supabase
              .from("products")
              .update({
                price: newPrice,
                discount: discAmount,
              })
              .eq("id", pId);
            if (pUpdateError) throw pUpdateError;
          }
        }
      }
    }

    const { data: productsToBook, error: fetchProductsError } = await supabase
      .from("products")
      .select("*")
      .in("id", productIds);

    if (fetchProductsError) throw fetchProductsError;

    const unavailable = (productsToBook || []).filter((p) => p.status !== "Tersedia" && p.status !== "Available");
    if (unavailable.length > 0) {
      return NextResponse.json(
        { success: false, error: `Produk [${unavailable.map((p) => p.id).join(", ")}] sedang tidak tersedia.` },
        { status: 400 }
      );
    }

    const productsPriceSum = (productsToBook || []).reduce((acc, p) => acc + p.price, 0);
    const finalTotalPrice = productsPriceSum + parseInt(String(shippingCost), 10);
    const parsedDp = parseInt(String(dpAmount), 10);

    let initialStatus = status;
    if (parsedDp > 0 && (initialStatus === "Menunggu" || initialStatus === "Keep")) {
      initialStatus = "DP";
    }

    const { data: newOrder, error: createOrderError } = await supabase
      .from("orders")
      .insert({
        customerId: finalCustomerId,
        status: initialStatus,
        shippingCourier,
        shippingService,
        shippingCost: parseInt(String(shippingCost), 10),
        totalWeightGram: parseInt(String(totalWeightGram), 10) || 1000,
        dpAmount: parsedDp,
        dpDate: parsedDp > 0 ? new Date().toISOString() : null,
        totalPrice: finalTotalPrice,
        trackingNo: trackingNo || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (createOrderError) throw createOrderError;

    // Update products status to "Dibooking" and link orderId
    const { error: updateProductsError } = await supabase
      .from("products")
      .update({
        status: "Dibooking",
        orderId: newOrder.id,
      })
      .in("id", productIds);

    if (updateProductsError) throw updateProductsError;

    const { data: result, error: fetchOrderError } = await supabase
      .from("orders")
      .select("*, customer:customers(*), products(*)")
      .eq("id", newOrder.id)
      .single();

    if (fetchOrderError) throw fetchOrderError;

    const normalized = {
      ...result,
      customer: Array.isArray(result.customer) ? result.customer[0] : result.customer || null,
      products: result.products || [],
    };

    return NextResponse.json(
      {
        success: true,
        data: normalized,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
