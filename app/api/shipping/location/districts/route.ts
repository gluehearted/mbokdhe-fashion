import { NextResponse } from "next/server";

function getApiKey(): string | null {
  const key = process.env.RAJAONGKIR_API_KEY || process.env.NEXT_PUBLIC_RAJAONGKIR_API_KEY;
  if (!key || key.includes("YOUR_") || key.includes("masukkan")) return null;
  return key.trim();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityId = searchParams.get("cityId");

    if (!cityId) {
      return NextResponse.json(
        { success: false, error: "Parameter 'cityId' wajib diisi." },
        { status: 400 }
      );
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "API Key RajaOngkir belum diatur di .env." },
        { status: 400 }
      );
    }

    const res = await fetch(`https://rajaongkir.komerce.id/api/v1/destination/district/${cityId}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        key: apiKey,
      },
      cache: "force-cache",
    });

    const data = await res.json();
    if (!res.ok || (data.meta && data.meta.code !== 200)) {
      return NextResponse.json(
        { success: false, error: data.meta?.message || "Gagal mengambil data kecamatan." },
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
