import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// GET /api/products?status=Tersedia
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // Support legacy "Available" filter mapped to "Tersedia"
    let mappedStatus = status;
    if (status === "Available") mappedStatus = "Tersedia";
    if (status === "Booked") mappedStatus = "Dibooking";
    if (status === "Sold") mappedStatus = "Terjual";

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    let query = supabase
      .from("products")
      .select("*, shop:shops(*), order:orders(id, status, customer:customers(name, whatsapp))")
      .order("id", { ascending: true });

    if (mappedStatus && mappedStatus !== "ALL") {
      query = query.eq("status", mappedStatus);
    }

    const { data: products, error } = await query;

    if (error) throw error;

    const mapped = (products || []).map((p: Record<string, unknown>) => {
      const shop = Array.isArray(p.shop) ? p.shop[0] : p.shop;
      const order = Array.isArray(p.order) ? p.order[0] : p.order;
      return {
        ...p,
        shop: shop || null,
        order: order ? {
          ...order,
          customer: Array.isArray(order.customer) ? order.customer[0] : order.customer || null
        } : null
      };
    });

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

  const { count, error } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .like("id", `${datePrefix}%`);

  if (error) throw error;

  let seq = (count || 0) + 1;
  let candidate = `${datePrefix}${String(seq).padStart(2, "0")}`;

  while (true) {
    const { data: existing, error: checkError } = await supabase
      .from("products")
      .select("id")
      .eq("id", candidate)
      .maybeSingle();

    if (checkError) throw checkError;
    if (!existing) break;

    seq++;
    candidate = `${datePrefix}${String(seq).padStart(2, "0")}`;
  }

  return candidate;
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

    // Find or create Shop to link shopId
    let shopObj;
    const { data: foundShop, error: shopFindError } = await supabase
      .from("shops")
      .select("*")
      .eq("name", shopOrigin)
      .maybeSingle();

    if (shopFindError) throw shopFindError;
    shopObj = foundShop;

    if (!shopObj) {
      const { data: newShop, error: shopCreateError } = await supabase
        .from("shops")
        .insert({ name: shopOrigin })
        .select()
        .single();

      if (shopCreateError) throw shopCreateError;
      shopObj = newShop;
    }

    let photoUrl = clientPhotoUrl || "/uploads/placeholder.jpg";

    if (!clientPhotoUrl && file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const fileExt = path.extname(file.name) || ".jpg";
      const fileName = `${id.replace(/[^a-zA-Z0-9_-]/g, "")}${fileExt}`;
      const uploadsDir = path.join(process.cwd(), "public", "uploads");

      await mkdir(uploadsDir, { recursive: true });
      const filePath = path.join(uploadsDir, fileName);

      await writeFile(filePath, buffer);
      photoUrl = `/uploads/${fileName}`;
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
