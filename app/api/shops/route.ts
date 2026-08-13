import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

// GET /api/shops
export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: shops, error } = await supabase
      .from("shops")
      .select("*")
      .order("createdAt", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: shops,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// POST /api/shops
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Nama Toko wajib diisi." },
        { status: 400 }
      );
    }

    const cleanName = name.trim();

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: existing, error: checkError } = await supabase
      .from("shops")
      .select("*")
      .eq("name", cleanName)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Toko '${cleanName}' sudah terdaftar dalam database.` },
        { status: 400 }
      );
    }

    const { data: shop, error: createError } = await supabase
      .from("shops")
      .insert({ name: cleanName })
      .select()
      .single();

    if (createError) throw createError;

    return NextResponse.json(
      { success: true, message: `Toko '${cleanName}' berhasil ditambahkan.`, data: shop },
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
