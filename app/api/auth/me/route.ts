import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("mbokdhe_session")?.value;

    if (!sessionToken || sessionToken !== "active_admin_session") {
      return NextResponse.json(
        { success: false, error: "Belum terautentikasi" },
        { status: 401 }
      );
    }

    const email = cookieStore.get("mbokdhe_admin_email")?.value || "admin@mbokdhe.com";
    const name = cookieStore.get("mbokdhe_admin_name")?.value || "Admin Mbokdhe";
    const role = cookieStore.get("mbokdhe_admin_role")?.value || "Admin";

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
