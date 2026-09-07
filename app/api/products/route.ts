import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

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

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Gunakan !inner pada relasi shop jika ada filter shop agar PostgreSQL memfilter langsung di database
    const shopQuery = shop && shop !== "ALL" ? "shop:shops!inner(*)" : "shop:shops(*)";

    let query = supabase
      .from("products")
      .select(`*, ${shopQuery}, order:orders(id, status, customer:customers(name, whatsapp))`, { count: "exact" })
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// Generator ID Otomatis (Single DB Hit tanpa while(true) loop)
async function generateAutoProductId(supabase: ReturnType<typeof createClient>, shopOrigin: string): Promise<string> {
  const cleanShop = shopOrigin.trim().replace(/[()]/g, "");
  const words = cleanShop.split(/\s+/).filter(Boolean);
  let prefix = "TAS";
  if (words.length >= 2) {
    prefix = words.map((w) => w[0].toUpperCase()).join("").slice(0, 4);
  } else if (cleanShop.length >= 3) {
    prefix = cleanShop.slice(0, 3).toUpperCase();
  } else if (cleanShop.length > 0) {
    prefix = cleanShop.toUpperCase();
  }

  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateCode = `${yy}${mm}${dd}`;

  const datePrefix = `${prefix}-${dateCode}-`;

  // Ambil SATU produk terakhir dengan prefix tanggal hari ini (diurutkan paling besar)
  const { data: latestProduct, error } = await supabase
    .from("products")
    .select("id")
    .like("id", `${datePrefix}%`)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  let seq = 1;
  if (latestProduct && latestProduct.id) {
    const lastSeqStr = latestProduct.id.replace(datePrefix, "");
    const lastSeqNum = parseInt(lastSeqStr, 10);
    if (!isNaN(lastSeqNum)) {
      seq = lastSeqNum + 1;
    }
  }

  return `${datePrefix}${String(seq).padStart(2, "0")}`;
}

// POST /api/products (multipart/form-data)
export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    let id = (formData.get("id") as string || "").trim();
    const shopOrigin = (formData.get("shopOrigin") as string || "").trim();
    const capitalPrice = parseInt((formData.get("capitalPrice") as string) || "0", 10);
    const price = parseInt((formData.get("price") as string) || "0", 10);
    const description = ((formData.get("description") as string) || "").trim();
    const file = formData.get("file") as File | null;
    const clientPhotoUrl = (formData.get("photoUrl") as string) || "";

    if (!shopOrigin || isNaN(price) || price <= 0) {
      return NextResponse.json(
        { success: false, error: "shopOrigin (Toko Asal) dan price (harga jual) wajib diisi." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Auto-generate ID if not provided
    if (!id) {
      id = await generateAutoProductId(supabase, shopOrigin);
    } else {
      const { data: existing, error: checkError } = await supabase
        .from("products")
        .select("id")
        .eq("id", id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        return NextResponse.json(
          { success: false, error: `Produk dengan ID ${id} sudah ada dalam database.` },
          { status: 400 }
        );
      }
    }

    // Find or create Shop (Upsert) to link shopId
    const { data: shopObj, error: shopUpsertError } = await supabase
      .from("shops")
      .upsert({ name: shopOrigin }, { onConflict: "name" })
      .select()
      .single();

    if (shopUpsertError) throw shopUpsertError;

    let photoUrl = clientPhotoUrl || "/uploads/placeholder.jpg";

    if (!clientPhotoUrl && file && file.size > 0) {
      try {
        const bytes = await file.arrayBuffer();
        const fileExt = file.name.split('.').pop() || "jpg";
        
        // Buat nama file unik (ID Tas + Timestamp)
        const fileName = `${id.replace(/[^a-zA-Z0-9_-]/g, "")}-${Date.now()}.${fileExt}`;
        const filePath = `bags/${fileName}`;

        // Upload file langsung ke Supabase Storage (Server-side)
        const { error: uploadError } = await supabase.storage
          .from("products")
          .upload(filePath, bytes, {
            contentType: file.type,
            upsert: true,
          });

        if (uploadError) throw uploadError;

        // Ambil URL public dari Supabase
        const { data: publicUrlData } = supabase.storage
          .from("products")
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          photoUrl = publicUrlData.publicUrl;
        }
      } catch (storageError: any) {
        console.error("Supabase server upload failed:", storageError.message);
        return NextResponse.json(
          { 
            success: false, 
            error: "Gagal mengunggah foto ke Supabase. Pastikan Storage Bucket 'products' telah dibuat di dashboard Supabase dengan akses Public." 
          },
          { status: 500 }
        );
      }
    }

    const { data: product, error: productCreateError } = await supabase
      .from("products")
      .insert({
        id,
        shopId: shopObj.id,
        capitalPrice,
        price,
        description,
        status: "Tersedia",
        photoUrl,
      })
      .select()
      .single();

    if (productCreateError) throw productCreateError;

    return NextResponse.json(
      {
        success: true,
        data: product,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
