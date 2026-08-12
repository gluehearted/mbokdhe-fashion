import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("mbokdhe_session");
    cookieStore.delete("mbokdhe_admin_email");

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
