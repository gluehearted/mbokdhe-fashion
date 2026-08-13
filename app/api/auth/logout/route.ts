import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Sign out from Supabase (clears Supabase cookies)
    await supabase.auth.signOut();

    // Delete companion metadata cookies
    cookieStore.delete("mbokdhe_admin_email");
    cookieStore.delete("mbokdhe_admin_name");
    cookieStore.delete("mbokdhe_admin_role");

    return NextResponse.json({
      success: true,
      message: "Berhasil keluar dari sesi Admin.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
