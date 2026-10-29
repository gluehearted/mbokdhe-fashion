import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

// Standardize status value mapping
function normalizeStatus(status: string | null): string | null {
  if (!status || status === "ALL") return null;
  if (status === "Siap_Packing" || status === "Siap Packing")
    return "Siap Kirim";
  if (status === "Shipped") return "Dikirim";
  if (status === "Cancelled") return "Dibatalkan";
  return status;
}

// Membuat filter ILIKE yang aman terhadap karakter khusus
// dalam input pengguna.
function makeIlikeFilter(column: string, value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  return `${column}.ilike."%${escaped}%"`;
}

// Mengenali format tanggal ISO, tanggal Indonesia,
// dan tanggal dengan nama bulan Indonesia.
function parseSearchDate(input: string): string | null {
  const value = input.trim().toLowerCase().replace(/\./g, "");

  let year: number;
  let month: number;
  let day: number;

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  const numericMatch = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

  const monthNames: Record<string, number> = {
    jan: 1,
    januari: 1,
    feb: 2,
    februari: 2,
    mar: 3,
    maret: 3,
    apr: 4,
    april: 4,
    mei: 5,
    jun: 6,
    juni: 6,
    jul: 7,
    juli: 7,
    agu: 8,
    agustus: 8,
    sep: 9,
    september: 9,
    okt: 10,
    oktober: 10,
    nov: 11,
    november: 11,
    des: 12,
    desember: 12,
  };

  const textMatch = value.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);

  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else if (numericMatch) {
    // Format Indonesia: DD/MM/YYYY atau DD-MM-YYYY
    day = Number(numericMatch[1]);
    month = Number(numericMatch[2]);
    year = Number(numericMatch[3]);
  } else if (textMatch && monthNames[textMatch[2]]) {
    day = Number(textMatch[1]);
    month = monthNames[textMatch[2]];
    year = Number(textMatch[3]);
  } else {
    return null;
  }

  const dateString =
    `${year}-${String(month).padStart(2, "0")}-` +
    `${String(day).padStart(2, "0")}`;

  const parsed = new Date(`${dateString}T00:00:00.000Z`);

  // Menolak tanggal yang tidak valid, seperti 31/02/2026.
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== dateString
  ) {
    return null;
  }

  return dateString;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const customerId = searchParams.get("customerId");
    const search = searchParams.get("search")?.trim();
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const isPaginated = Boolean(pageParam);
    const page = Math.max(1, parseInt(pageParam || "1", 10));
    const limit = Math.max(1, parseInt(limitParam || "10", 10));

    // Determine query structure based on whether customer search is needed
    // Using !inner join on customer ensures OR filter across join table works smoothly
    const selectQuery = "*, customer:customers(*), products(*, shop:shops(*))";

    let query = supabase
      .from("orders")
      .select(selectQuery, { count: "exact" })
      .order("createdAt", { ascending: false });

    // 1. Filter Status
    const filterStatus = normalizeStatus(statusParam);
    if (filterStatus) {
      query = query.eq("status", filterStatus);
    }

    // 2. Filter Customer ID
    if (customerId) {
      query = query.eq("customerId", customerId);
    }

    // 3. Multi-Field Search
    if (search) {
      const searchDate = parseSearchDate(search);

      if (searchDate) {
        // Tanggal mengikuti zona waktu WIB (UTC+7),
        // sama dengan tanggal yang ditampilkan di tabel.
        const startOfDay = new Date(
          `${searchDate}T00:00:00.000+07:00`,
        ).toISOString();

        const endOfDay = new Date(
          `${searchDate}T23:59:59.999+07:00`,
        ).toISOString();

        query = query.gte("createdAt", startOfDay).lte("createdAt", endOfDay);
      } else {
        // A. Cari nama dan nomor WhatsApp pelanggan.
        const customerFilters = [
          makeIlikeFilter("name", search),
          makeIlikeFilter("whatsapp", search),
        ];

        // Mendukung nomor telepon dengan spasi, tanda hubung,
        // atau awalan 0 / 62.
        const phoneDigits = search.replace(/\D/g, "");

        if (phoneDigits.length >= 4 && /^[+\d\s().-]+$/.test(search)) {
          const phoneVariants = new Set<string>([phoneDigits]);

          if (phoneDigits.startsWith("0")) {
            phoneVariants.add(`62${phoneDigits.slice(1)}`);
          }

          if (phoneDigits.startsWith("62")) {
            phoneVariants.add(`0${phoneDigits.slice(2)}`);
          }

          for (const digits of phoneVariants) {
            const flexiblePattern = digits.split("").join("%");

            customerFilters.push(makeIlikeFilter("whatsapp", flexiblePattern));
          }
        }

        const { data: matchedCustomers, error: customerSearchError } =
          await supabase
            .from("customers")
            .select("id")
            .or(customerFilters.join(","));

        if (customerSearchError) {
          throw customerSearchError;
        }

        const customerIds = (matchedCustomers || []).map(
          (customer) => customer.id,
        );

        // B. Cari kolom pesanan, termasuk ID parsial.
        // id_search adalah kolom teks yang dibuat di Supabase.
        const idSearch = search.replace(/^#/, "").trim();

        const orderFilters = [
          makeIlikeFilter("id_search", idSearch),
          makeIlikeFilter("trackingNo", search),
          makeIlikeFilter("shippingCourier", search),
          makeIlikeFilter("shippingService", search),
          makeIlikeFilter("notes", search),
        ];

        // C. Sertakan pesanan dari pelanggan yang cocok.
        if (customerIds.length > 0) {
          orderFilters.push(`customerId.in.(${customerIds.join(",")})`);
        }

        query = query.or(orderFilters.join(","));
      }
    }

    // 4. Pagination Range
    if (isPaginated) {
      const start = (page - 1) * limit;
      const end = start + limit - 1;
      query = query.range(start, end);
    }

    const { data: orders, error, count } = await query;
    if (error) throw error;

    // Data Transformation & Calculation
    const mappedOrders = (orders || []).map((o: any) => {
      const customer = Array.isArray(o.customer)
        ? o.customer[0]
        : o.customer || null;
      const products = (o.products || []).map((p: any) => ({
        ...p,
        shop: Array.isArray(p.shop) ? p.shop[0] : p.shop || null,
      }));

      let calculatedTotalPrice = o.totalPrice || 0;
      if (products.length > 0) {
        const itemNetTotal = products.reduce(
          (sum: number, p: any) =>
            sum + Math.max(0, (p.price || 0) - (p.discount || 0)),
          0,
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

    const totalRecords = count !== null ? count : mappedOrders.length;

    return NextResponse.json({
      success: true,
      data: mappedOrders,
      totalCount: totalRecords,
      page,
      limit,
      totalPages: Math.ceil(totalRecords / limit) || 1,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
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
      notes = null,
    } = body;

    if (
      (!productIds || !Array.isArray(productIds) || productIds.length === 0) &&
      Array.isArray(products)
    ) {
      productIds = products
        .map((p: any) => p.productId || p.id)
        .filter(Boolean);
    }

    if (!customerId) throw new Error("Pelanggan (Customer) wajib dipilih.");
    if (!productIds || productIds.length === 0)
      throw new Error("Pilih minimal 1 tas.");

    const orderStatus = normalizeStatus(status) || "Menunggu";

    // 1. Fetch & Verify Product Availability
    const { data: dbProducts, error: fetchError } = await supabase
      .from("products")
      .select("id, price, status")
      .in("id", productIds);

    if (fetchError) throw fetchError;

    const unavailable =
      dbProducts?.filter(
        (p) => p.status !== "Tersedia" && p.status !== "Available",
      ) || [];
    if (unavailable.length > 0) {
      throw new Error(
        `Tas [${unavailable.map((p) => p.id).join(", ")}] sudah tidak tersedia.`,
      );
    }

    // 2. Calculate Total Price
    let totalBarangNet = 0;
    for (const dbProduct of dbProducts || []) {
      const userProduct = products?.find(
        (p: any) => p.productId === dbProduct.id,
      );
      const basePrice =
        userProduct?.customPrice !== undefined
          ? userProduct.customPrice
          : dbProduct.price;
      const discount = userProduct?.discount ? Number(userProduct.discount) : 0;
      totalBarangNet += Math.max(0, basePrice - discount);
    }

    const finalTotalPrice =
      body.totalPrice !== undefined
        ? Number(body.totalPrice)
        : totalBarangNet + Number(shippingCost);

    // 3. Insert Order Record
    const { data: newOrder, error: orderError } = await supabase
      .from("orders")
      .insert([
        {
          customerId,
          status: orderStatus,
          shippingCourier: courier || "JNE",
          shippingCost: Number(shippingCost),
          totalPrice: finalTotalPrice,
          dpAmount: Number(dpAmount),
          dpDate: Number(dpAmount) > 0 ? new Date().toISOString() : null,
          notes: notes ? String(notes).trim() : null,
          updatedAt: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (orderError) throw orderError;

    // 4. Batch Update Product Status & Pricing
    const productStatus = orderStatus === "Dikirim" ? "Terjual" : "Dibooking";
    const updatePromises = (dbProducts || []).map((dbProduct) => {
      const userProduct = products?.find(
        (p: any) => p.productId === dbProduct.id,
      );
      const rawPrice = userProduct?.customPrice;
      const validPrice =
        rawPrice !== undefined && rawPrice !== "" && !isNaN(Number(rawPrice))
          ? Number(rawPrice)
          : dbProduct.price;
      const rawDiscount = userProduct?.discount;
      const validDiscount =
        rawDiscount !== undefined &&
        rawDiscount !== "" &&
        !isNaN(Number(rawDiscount))
          ? Number(rawDiscount)
          : 0;

      return supabase
        .from("products")
        .update({
          status: productStatus,
          orderId: newOrder.id,
          price: validPrice,
          discount: validDiscount,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", dbProduct.id);
    });

    const updateResults = await Promise.all(updatePromises);
    if (updateResults.some((res) => res.error)) {
      throw new Error(
        "Sebagian tas gagal diupdate statusnya. Silakan cek database.",
      );
    }

    // 5. Fetch Final Populated Order
    const { data: result } = await supabase
      .from("orders")
      .select("*, customer:customers(*), products(*)")
      .eq("id", newOrder.id)
      .single();

    return NextResponse.json(
      {
        success: true,
        data: {
          ...result,
          customer: Array.isArray(result?.customer)
            ? result.customer[0]
            : result?.customer || null,
          products: result?.products || [],
          totalPrice: finalTotalPrice,
        },
      },
      { status: 201 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}
