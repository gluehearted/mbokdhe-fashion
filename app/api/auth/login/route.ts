import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";

interface AdminAccount {
  email: string;
  password?: string;
  name: string;
  role: string;
}

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

    let matchedAccount: AdminAccount | null = null;

    // 1. Try parsing multi-account list from ADMIN_ACCOUNTS JSON string
    const adminAccountsEnv = process.env.ADMIN_ACCOUNTS;
    if (adminAccountsEnv) {
      try {
        const accounts: AdminAccount[] = JSON.parse(adminAccountsEnv);
        if (Array.isArray(accounts)) {
          const found = accounts.find(
            (acc) =>
              acc.email.trim().toLowerCase() === cleanEmail &&
              acc.password?.trim() === cleanPassword
          );
          if (found) {
            matchedAccount = {
              email: found.email,
              name: found.name || "Admin",
              role: found.role || "Admin",
            };
          }
        }
      } catch (err) {
        console.error("Format JSON pada ADMIN_ACCOUNTS tidak valid:", err);
      }
    }

    // 2. Check individual environment variables if not matched yet
    if (!matchedAccount) {
      const ownerEmail = (process.env.ADMIN_EMAIL || "owner@mbokdhe.com").trim().toLowerCase();
      const ownerPassword = (process.env.ADMIN_PASSWORD || "MbokdheFashion2026!").trim();
      const ownerName = process.env.ADMIN_NAME || "Owner Mbokdhe";

      const staffEmail = (process.env.STAFF_EMAIL || "staff@mbokdhe.com").trim().toLowerCase();
      const staffPassword = (process.env.STAFF_PASSWORD || "StaffMbokdhe2026!").trim();
      const staffName = process.env.STAFF_NAME || "Staff Operasional";

      if (cleanEmail === ownerEmail && cleanPassword === ownerPassword) {
        matchedAccount = {
          email: ownerEmail,
          name: ownerName,
          role: "Owner",
        };
      } else if (cleanEmail === staffEmail && cleanPassword === staffPassword) {
        matchedAccount = {
          email: staffEmail,
          name: staffName,
          role: "Staff",
        };
      }
    }

    // 3. Fallback to Supabase Auth if configured and still not matched
    if (!matchedAccount && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (!error && data.user) {
          matchedAccount = {
            email: cleanEmail,
            name: data.user.user_metadata?.name || cleanEmail.split("@")[0],
            role: data.user.user_metadata?.role || "Staff",
          };
        }
      } catch {
        // Fallback to null if Supabase Auth call fails
      }
    }

    if (!matchedAccount) {
      return NextResponse.json(
        { success: false, error: "Email atau Kata Sandi tidak cocok." },
        { status: 401 }
      );
    }

    // Set secure HTTP-Only Session Cookies
    const cookieStore = await cookies();
    cookieStore.set("mbokdhe_session", "active_admin_session", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    cookieStore.set("mbokdhe_admin_email", matchedAccount.email, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    cookieStore.set("mbokdhe_admin_name", matchedAccount.name, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    cookieStore.set("mbokdhe_admin_role", matchedAccount.role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil masuk sebagai ${matchedAccount.name} (${matchedAccount.role}).`,
      user: matchedAccount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
