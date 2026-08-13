import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPassword = (password || "").trim();

    if (!cleanEmail || !cleanPassword) {
      return NextResponse.json(
        { success: false, error: "Email dan Kata Sandi wajib diisi." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Authenticate using Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword,
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { success: false, error: "Gagal memuat profil pengguna." },
        { status: 500 }
      );
    }

    // Get metadata details from user profile or metadata
    const name = data.user.user_metadata?.name || cleanEmail.split("@")[0];
    const role = data.user.user_metadata?.role || "Staff";

    // Set companion cookies for the frontend UI components
    cookieStore.set("mbokdhe_admin_email", cleanEmail, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    cookieStore.set("mbokdhe_admin_name", name, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    cookieStore.set("mbokdhe_admin_role", role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil masuk sebagai ${name} (${role}).`,
      user: {
        email: cleanEmail,
        name,
        role,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
