import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";

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

    const envAdminEmail = (process.env.ADMIN_EMAIL || "admin@mbokdhe.com").trim().toLowerCase();
    const envAdminPassword = (process.env.ADMIN_PASSWORD || "MbokdheFashion2026!").trim();

    let authenticated = false;
    let authSource = "env";

    // 1. Check against Environment Admin Credentials
    if (cleanEmail === envAdminEmail && cleanPassword === envAdminPassword) {
      authenticated = true;
      authSource = "env";
    }

    // 2. If Supabase Auth is configured, check Supabase Auth as secondary/primary
    if (!authenticated && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (!error && data.user) {
          authenticated = true;
          authSource = "supabase";
        }
      } catch {
        // Fallback to false if Supabase Auth call fails
      }
    }

    if (!authenticated) {
      return NextResponse.json(
        { success: false, error: "Email atau Kata Sandi Admin tidak cocok." },
        { status: 401 }
      );
    }

    // Set secure HTTP-Only Session Cookie
    const cookieStore = await cookies();
    cookieStore.set("mbokdhe_session", "active_admin_session", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    cookieStore.set("mbokdhe_admin_email", cleanEmail, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({
      success: true,
      message: "Berhasil masuk ke Dashboard Admin Mbokdhe Fashion.",
      user: {
        email: cleanEmail,
        source: authSource,
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
