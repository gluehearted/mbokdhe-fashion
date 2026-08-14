import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore); 

    let query = supabase
      .from("orders")
      .select("*, customer:customers(*), products(*, shop:shops(*))")
      .order("createdAt", { ascending: false });

    if (status && status !== "ALL") {
      let checkStatus = status;
      if (status === "Keep") checkStatus = "Menunggu";
      else if (status === "Siap_Packing" || status === "Siap Packing") checkStatus = "Siap Kirim";
      else if (status === "Shipped") checkStatus = "Dikirim";
      else if (status === "Cancelled") checkStatus = "Dibatalkan";

      query = query.eq("status", checkStatus);
    }

    if (customerId) {
      query = query.eq("customerId", customerId);
    }

    const { data: orders, error } = await query;
    if (error) throw error;

    // Normalisasi format data dari array relasi Supabase
    const mapped = (orders || []).map((o: any) => ({
      ...o,
      customer: Array.isArray(o.customer) ? o.customer[0] : o.customer || null,
      products: (o.products || []).map((p: any) => ({
        ...p,
        shop: Array.isArray(p.shop) ? p.shop[0] : p.shop || null,
      })),
    }));

    return NextResponse.json({ success: true, data: mapped });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    // 1. Ambil payload dan paskan dengan variabel kiriman Frontend
    const body = await request.json().catch(() => null);
    if (!body) throw new Error("Format data tidak valid");

    const {
      customerId,
      productIds,
      products, // Frontend mengirim array of object {productId, discount, customPrice}
      shippingCost = 0,
      courier, 
      status = "Menunggu",
      dpAmount = 0
    } = body;

    let orderStatus = status;
    if (orderStatus === "Keep") orderStatus = "Menunggu";
    if (orderStatus === "Siap_Packing" || orderStatus === "Siap_Kirim" || orderStatus === "Siap Packing") orderStatus = "Siap Kirim";
    if (orderStatus === "Shipped") orderStatus = "Dikirim";
    if (orderStatus === "Cancelled") orderStatus = "Dibatalkan";

    if (!customerId) throw new Error("Pelanggan (Customer) wajib dipilih.");
    if (!productIds || productIds.length === 0) throw new Error("Pilih minimal 1 tas.");

    // 2. Cek ketersediaan produk di database (Pastikan tas belum keduluan dibeli orang)
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

    // 3. Hitung total harga sesuai diskon individual dari Frontend
    let totalBarang = 0;
    for (const dbProduct of dbProducts || []) {
      const userProduct = products?.find((p: any) => p.productId === dbProduct.id);
      const finalPrice = userProduct?.customPrice !== undefined ? userProduct.customPrice : dbProduct.price;
      totalBarang += finalPrice;
    }

    const totalTagihan = totalBarang + Number(shippingCost);

    // 4. Buat Order baru di database
    const { data: newOrder, error: orderError } = await supabase
      .from("orders")
      .insert([{
        customerId,
        status: orderStatus,
        shippingCourier: courier || "JNE",
        shippingCost: Number(shippingCost),
        totalPrice: totalTagihan,
        dpAmount: Number(dpAmount),
        dpDate: Number(dpAmount) > 0 ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    // 5. Update status tas menjadi Dibooking & ubah harganya jika ada diskon
    for (const dbProduct of dbProducts || []) {
      const userProduct = products?.find((p: any) => p.productId === dbProduct.id);
      
      const { error: updateProductError } = await supabase
        .from("products")
        .update({
          status: "Dibooking",
          orderId: newOrder.id, // Sambungkan tas ini ke order yang baru dibuat
          price: userProduct?.customPrice !== undefined ? userProduct.customPrice : dbProduct.price,
          discount: userProduct?.discount || 0
        })
        .eq("id", dbProduct.id);

      if (updateProductError) throw updateProductError;
    }

    // Ambil order lengkap yang baru dibuat untuk dikembalikan ke frontend
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

    return NextResponse.json({ success: true, data: normalized }, { status: 201 });

  } catch (err: any) {
    console.error("API Orders POST Error:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
