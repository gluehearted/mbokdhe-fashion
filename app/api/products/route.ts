import { NextResponse } from "next/server";
import { failure, requireStaff } from "@/lib/crm/request";

// GET /api/products?status=Tersedia&page=1&limit=10&shop=ShopName&search=keyword
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const shop = searchParams.get("shop");
    const search = searchParams.get("search");
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    let mappedStatus = status;
    if (status === "Available") mappedStatus = "Tersedia";
    if (status === "Booked") mappedStatus = "Dibooking";
    if (status === "Sold") mappedStatus = "Terjual";

    const { supabase } = await requireStaff(request, false);

    // Gunakan !inner pada relasi shop jika ada filter shop agar PostgreSQL memfilter langsung di database
    const shopQuery = shop && shop !== "ALL" ? "shop:shops!inner(*)" : "shop:shops(*)";

    let query = supabase
      .from("products")
      .select(`*, ${shopQuery}, order:orders(id, status, customer:customers(name, whatsapp))`, { count: "exact" })
      .order("createdAt", { ascending: false })
      .order("id", { ascending: false });

    // Filter Status
    if (mappedStatus && mappedStatus !== "ALL") {
      query = query.eq("status", mappedStatus);
    }

    // Filter Shop Name/ID langsung di database (bukan di JavaScript)
    if (shop && shop !== "ALL") {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shop);
      if (isUUID) {
        query = query.eq("shopId", shop);
      } else {
        query = query.eq("shops.name", shop);
      }
    }

    // Search keyword across id or description
    if (search && search.trim() !== "") {
      const q = search.trim();
      query = query.or(`id.ilike.%${q}%,description.ilike.%${q}%`);
    }

    // Server-side Pagination
    const isPaginated = Boolean(pageParam);
    const page = parseInt(pageParam || "1", 10);
    const limit = parseInt(limitParam || "10", 10);

    if (isPaginated && page > 0 && limit > 0) {
      const start = (page - 1) * limit;
      const end = start + limit - 1;
      query = query.range(start, end);
    }

    const { data: products, error, count } = await query;

    if (error) throw error;

    const mapped = (products || []).map((p: Record<string, unknown>) => {
      const shopObj = Array.isArray(p.shop) ? p.shop[0] : p.shop;
      const orderObj = Array.isArray(p.order) ? p.order[0] : p.order;
      return {
        ...p,
        shop: shopObj || null,
        order: orderObj ? {
          ...orderObj,
          customer: Array.isArray(orderObj.customer) ? orderObj.customer[0] : orderObj.customer || null
        } : null
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
  } catch (error) { return failure(error, "Gagal memuat produk."); }
}

// All creation goes through the transactional batch endpoint, including a batch of one.
export async function POST() {
  return NextResponse.json({ success: false, error: "Gunakan form produk terbaru untuk menyimpan batch." }, { status: 410 });
}
