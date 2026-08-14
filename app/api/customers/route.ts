import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

async function generateAutoCustomerId(supabase: any): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateCode = `${yy}${mm}${dd}`;
  const prefix = `CST-${dateCode}-`;

  const { count, error } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .like("id", `${prefix}%`);

  if (error) throw error;

  let seq = (count || 0) + 1;
  let candidate = `${prefix}${String(seq).padStart(2, "0")}`;

  while (true) {
    const { data: existing, error: checkError } = await supabase
      .from("customers")
      .select("id")
      .eq("id", candidate)
      .maybeSingle();

    if (checkError) throw checkError;
    if (!existing) break;

    seq++;
    candidate = `${prefix}${String(seq).padStart(2, "0")}`;
  }

  return candidate;
}

// GET /api/customers?search=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    let query = supabase
      .from("customers")
      .select("*, orders(id, status, totalPrice, createdAt)")
      .order("createdAt", { ascending: false });

    if (search) {
      query = query.or(
        `id.ilike.%${search}%,name.ilike.%${search}%,whatsapp.ilike.%${search}%,domisili.ilike.%${search}%,courier.ilike.%${search}%,behavioral.ilike.%${search}%,consumerType.ilike.%${search}%`
      );
    }

    const { data: customers, error } = await query;

    if (error) throw error;

    // Compute live totalSpending & totalTransactions if needed
    const mapped = (customers || []).map((c: any) => {
      const orders = c.orders || [];
      const ordersCount = orders.length;
      const calculatedSpending = orders.reduce((sum: number, o: any) => sum + (o.status !== "Dibatalkan" && o.status !== "Cancelled" ? o.totalPrice : 0), 0);
      return {
        ...c,
        _count: { orders: ordersCount },
        totalTransactions: c.totalTransactions || ordersCount,
        totalSpending: c.totalSpending || calculatedSpending,
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
