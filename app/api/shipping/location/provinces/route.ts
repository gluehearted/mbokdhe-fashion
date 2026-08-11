import { NextResponse } from "next/server";

function getApiKey(): string | null {
  // RajaOngkir API Key lookup dari environment variables (.env)
  const key = process.env.RAJAONGKIR_API_KEY || process.env.NEXT_PUBLIC_RAJAONGKIR_API_KEY;
  if (!key || key.includes("YOUR_") || key.includes("masukkan")) return null;
  return key.trim();
}

export async function GET() {
  try {
    // RajaOngkir API Key verification
    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "API Key RajaOngkir belum diatur di .env." },
        { status: 400 }
      );
    }

    // API Call (dengan Header Key RajaOngkir): GET https://rajaongkir.komerce.id/api/v1/destination/province
    const res = await fetch("https://rajaongkir.komerce.id/api/v1/destination/province", {
      method: "GET",
      headers: {
        accept: "application/json",
        // Header Key RajaOngkir API Key:
        key: apiKey,
      },
      cache: "force-cache",
    });

    const data = await res.json();
    if (!res.ok || (data.meta && data.meta.code !== 200)) {
      return NextResponse.json(
        { success: false, error: data.meta?.message || "Gagal mengambil data provinsi." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data.data || data.results || [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
