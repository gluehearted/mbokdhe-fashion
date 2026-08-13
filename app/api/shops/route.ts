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
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // 1. Ambil data JSON dengan pengaman jika body kosong
    const body = await request.json().catch(() => ({}));
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Nama Toko wajib diisi dengan benar." },
        { status: 400 }
      );
    }

    const cleanName = name.trim();

    // 2. Eksekusi insert ke Supabase secara langsung (atomik)
    const { data: shop, error: createError } = await supabase
      .from("shops")
      .insert({ name: cleanName })
      .select()
      .single();

    if (createError) {
      // Tangkap error khusus duplikat data (PostgreSQL error code: 23505)
      if (createError.code === "23505") {
        return NextResponse.json(
          { success: false, error: `Toko '${cleanName}' sudah terdaftar dalam database.` },
          { status: 409 }
        );
      }

      // Tangkap error RLS atau validasi database lainnya
      console.error("Supabase Insert Error:", createError.message);
      return NextResponse.json(
        { success: false, error: createError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, message: `Toko '${cleanName}' berhasil ditambahkan.`, data: shop },
      { status: 201 }
    );
  } catch (error: unknown) {
    // Tangkap error tak terduga (parsing body gagal, dll)
    console.error("Internal API POST Error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan pada server internal." },
      { status: 500 }
    );
  }
}
