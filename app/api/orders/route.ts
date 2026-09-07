import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");
    const search = searchParams.get("search");
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore); 

    let query = supabase
      .from("orders")
      .select("*, customer:customers(*), products(*, shop:shops(*))", { count: "exact" })
      .order("createdAt", { ascending: false });

    if (status && status !== "ALL") {
      let checkStatus = status;
      if (status === "Siap_Packing" || status === "Siap Packing") checkStatus = "Siap Kirim";
      else if (status === "Shipped") checkStatus = "Dikirim";
      else if (status === "Cancelled") checkStatus = "Dibatalkan";

      if (checkStatus === "Keep (Belum Bayar)") {
        query = query.or('status.eq."Keep (Belum Bayar)",status.eq.Keep');
      } else if (checkStatus === "Keep (Lunas)") {
        query = query.or('status.eq."Keep (Lunas)",status.eq.Keep');
      } else {
        query = query.eq("status", checkStatus);
      }
    }

    if (customerId) {
      query = query.eq("customerId", customerId);
    }

    if (search && search.trim() !== "") {
      const q = search.trim();
      query = query.or(`id.ilike.%${q}%,notes.ilike.%${q}%,trackingNo.ilike.%${q}%`);
    }

    const isPaginated = Boolean(pageParam);
    const page = parseInt(pageParam || "1", 10);
    const limit = parseInt(limitParam || "10", 10);

    if (isPaginated && page > 0 && limit > 0) {
      const start = (page - 1) * limit;
      const end = start + limit - 1;
      query = query.range(start, end);
    }

    const { data: orders, error, count } = await query;
    if (error) throw error;

    // OPTIMASI 1: Read-Only kalkulasi tanpa side-effect DB update saat GET
    const mapped = (orders || []).map((o: any) => {
      const customer = Array.isArray(o.customer) ? o.customer[0] : o.customer || null;
      const products = (o.products || []).map((p: any) => ({
        ...p,
        shop: Array.isArray(p.shop) ? p.shop[0] : p.shop || null,
      }));

      let calculatedTotalPrice = o.totalPrice || 0;
      if (products.length > 0) {
        const itemNetTotal = products.reduce(
          (sum: number, p: any) => sum + Math.max(0, (p.price || 0) - (p.discount || 0)),
          0
        );
        calculatedTotalPrice = itemNetTotal + (o.shippingCost || 0);
      }

      return {
        ...o,
        customer,
        products,
        totalPrice: calculatedTotalPrice,
      };
    });

    const totalCount = count !== null ? count : mapped.length;

    return NextResponse.json({
      success: true,
      data: mapped,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    const body = await request.json().catch(() => null);
    if (!body) throw new Error("Format data tidak valid");

    let {
      customerId,
      productIds,
      products,
      shippingCost = 0,
      courier, 
      status = "Menunggu",
      dpAmount = 0,
      notes = null
    } = body;

    if ((!productIds || !Array.isArray(productIds) || productIds.length === 0) && Array.isArray(products)) {
      productIds = products.map((p: any) => p.productId || p.id).filter(Boolean);
    }

    let orderStatus = status;
    if (orderStatus === "Keep") orderStatus = "Keep";
    if (orderStatus === "Siap_Packing" || orderStatus === "Siap_Kirim" || orderStatus === "Siap Packing") orderStatus = "Siap Kirim";
    if (orderStatus === "Shipped") orderStatus = "Dikirim";
    if (orderStatus === "Cancelled") orderStatus = "Dibatalkan";

    if (!customerId) throw new Error("Pelanggan (Customer) wajib dipilih.");
    if (!productIds || productIds.length === 0) throw new Error("Pilih minimal 1 tas.");

    const { data: dbProducts, error: fetchError } = await supabase
      .from("products")
      .select("id, price, status")
      .in("id", productIds);

    if (fetchError) throw fetchError;

    const unavailable = dbProducts?.filter(p => p.status !== "Tersedia" && p.status !== "Available") || [];
    if (unavailable.length > 0) {
      const unavailableIds = unavailable.map(p => p.id).join(", ");
      throw new Error(`Tas [${unavailableIds}] sudah tidak tersedia (mungkin sudah terjual).`);
    }

    let totalBarangNet = 0;
    for (const dbProduct of dbProducts || []) {
      const userProduct = products?.find((p: any) => p.productId === dbProduct.id);
      const basePrice = userProduct?.customPrice !== undefined ? userProduct.customPrice : dbProduct.price;
      const discount = userProduct?.discount ? Number(userProduct.discount) : 0;
      const effectivePrice = Math.max(0, basePrice - discount);
      totalBarangNet += effectivePrice;
    }

    const calculatedTotalTagihan = totalBarangNet + Number(shippingCost);
    const finalTotalPrice = body.totalPrice !== undefined ? Number(body.totalPrice) : calculatedTotalTagihan;

    const { data: newOrder, error: orderError } = await supabase
      .from("orders")
      .insert([{
        customerId,
        status: orderStatus,
        shippingCourier: courier || "JNE",
        shippingCost: Number(shippingCost),
        totalPrice: finalTotalPrice,
        dpAmount: Number(dpAmount),
        dpDate: Number(dpAmount) > 0 ? new Date().toISOString() : null,
        notes: notes ? String(notes).trim() : null,
        updatedAt: new Date().toISOString(),
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    // OPTIMASI 2: Update status tas secara paralel (bersamaan) menggunakan Promise.all
    const updatePromises = (dbProducts || []).map(dbProduct => {
      const userProduct = products?.find((p: any) => p.productId === dbProduct.id);
      
      return supabase
        .from("products")
        .update({
          status: "Dibooking",
          orderId: newOrder.id,
          price: userProduct?.customPrice !== undefined ? userProduct.customPrice : dbProduct.price,
          discount: userProduct?.discount || 0,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", dbProduct.id);
    });

    const updateResults = await Promise.all(updatePromises);
    
    const failedUpdates = updateResults.filter(res => res.error);
    if (failedUpdates.length > 0) {
      console.error("Sebagian tas gagal diupdate:", failedUpdates);
      throw new Error("Sebagian tas gagal diupdate statusnya. Silakan cek database.");
    }

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
      totalPrice: finalTotalPrice,
    };

    return NextResponse.json({ success: true, data: normalized }, { status: 201 });

  } catch (err: any) {
    console.error("API Orders POST Error:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
