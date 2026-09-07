import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

// OPTIMASI: 1x Hit Database untuk Auto ID Customer
async function generateAutoCustomerId(supabase: ReturnType<typeof createClient>): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateCode = `${yy}${mm}${dd}`;
  const prefix = `CST-${dateCode}-`;

  // Langsung ambil 1 ID terakhir hari ini, diurutkan dari yang paling besar
  const { data: latestCustomer, error } = await supabase
    .from("customers")
    .select("id")
    .like("id", `${prefix}%`)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  let seq = 1;

  if (latestCustomer && latestCustomer.id) {
    const lastSeqStr = latestCustomer.id.replace(prefix, "");
    const lastSeqNum = parseInt(lastSeqStr, 10);
    if (!isNaN(lastSeqNum)) {
      seq = lastSeqNum + 1;
    }
  }

  return `${prefix}${String(seq).padStart(2, "0")}`;
}

// GET /api/customers?search=...&page=1&limit=10
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    let query = supabase
      .from("customers")
      .select("*, orders(id, status, totalPrice, shippingCost, createdAt, products(price, discount))", { count: "exact" })
      .order("createdAt", { ascending: false });

    if (search && search.trim() !== "") {
      const q = search.trim();
      query = query.or(
        `id.ilike.%${q}%,name.ilike.%${q}%,whatsapp.ilike.%${q}%,domisili.ilike.%${q}%,courier.ilike.%${q}%,behavioral.ilike.%${q}%,consumerType.ilike.%${q}%`
      );
    }

    const isPaginated = Boolean(pageParam);
    const page = parseInt(pageParam || "1", 10);
    const limit = parseInt(limitParam || "10", 10);

    if (isPaginated && page > 0 && limit > 0) {
      const start = (page - 1) * limit;
      const end = start + limit - 1;
      query = query.range(start, end);
    }

    const { data: customers, error, count } = await query;

    if (error) throw error;

    // Compute live totalSpending & totalTransactions (hanya pesanan berstatus 'Siap Kirim' atau 'Dikirim')
    const mapped = (customers || []).map((c: any) => {
      const orders = c.orders || [];
      const validOrders = orders.filter((o: any) => {
        const st = o.status;
        return (
          st === "Siap Kirim" ||
          st === "Siap_Kirim" ||
          st === "Siap Packing" ||
          st === "Dikirim" ||
          st === "Shipped"
        );
      });

      const validTransactionsCount = validOrders.length;
      const validTotalSpending = validOrders.reduce((sum: number, o: any) => {
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

      return {
        ...c,
        _count: { orders: validTransactionsCount },
        totalTransactions: validTransactionsCount,
        totalSpending: validTotalSpending,
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

// POST /api/customers (Create new customer with auto CUST ID)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      whatsapp,
      domisili,
      shippingCost = 0,
      courier,
      addressDetail,
      behavioral,
      consumerType,
      relationshipStatus,
      crisisStatus,
    } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { success: false, error: "Nama pelanggan wajib diisi." },
        { status: 400 }
      );
    }

    const cleanWhatsapp = whatsapp ? String(whatsapp).trim().replace(/[^0-9]/g, "") : "";

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    if (cleanWhatsapp) {
      const { data: existing, error: checkError } = await supabase
        .from("customers")
        .select("id")
        .eq("whatsapp", cleanWhatsapp)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        return NextResponse.json(
          { success: false, error: `Pelanggan dengan nomor WhatsApp ${cleanWhatsapp} sudah terdaftar.` },
          { status: 400 }
        );
      }
    }

    const customId = await generateAutoCustomerId(supabase);

    const { data: newCustomer, error: createError } = await supabase
      .from("customers")
      .insert({
        id: customId,
        name: name.trim(),
        whatsapp: cleanWhatsapp || "-",
        domisili: domisili ? domisili.trim() : null,
        shippingCost: parseInt(String(shippingCost), 10) || 0,
        courier: courier ? courier.trim() : "JNE",
        addressDetail: addressDetail ? addressDetail.trim() : "-",
        behavioral: behavioral ? behavioral.trim() : "Loyal",
        consumerType: consumerType ? consumerType.trim() : "Retail",
        relationshipStatus: relationshipStatus ? relationshipStatus.trim() : "Active",
        crisisStatus: crisisStatus ? crisisStatus.trim() : "Normal",
      })
      .select()
      .single();

    if (createError) throw createError;

    return NextResponse.json(
      {
        success: true,
        data: newCustomer,
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
