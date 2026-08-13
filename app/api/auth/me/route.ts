import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: "Belum terautentikasi" },
        { status: 401 }
      );
    }

    const email = user.email || "";
    const name = user.user_metadata?.name || email.split("@")[0];
    const role = user.user_metadata?.role || "Admin";

    return NextResponse.json({
      success: true,
      user: {
        email,
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
