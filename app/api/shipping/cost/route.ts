import { NextResponse } from "next/server";

function isPlaceholderKey(key?: string): boolean {
  if (!key) return true;
  const k = key.trim().toLowerCase();
  return (
    k === "" ||
    k.includes("masukkan") ||
    k.includes("tempel") ||
    k.includes("disini") ||
    k.includes("your_") ||
    k.includes("api_key")
  );
}

function getValidApiKey(): string | null {
  const keys = [
    process.env.RAJAONGKIR_API_KEY,
    process.env.NEXT_PUBLIC_RAJAONGKIR_API_KEY,
  ];
  for (const k of keys) {
    if (k && !isPlaceholderKey(k)) {
      return k.trim();
    }
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const apiKey = getValidApiKey();

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "API Key RajaOngkir belum diisi di file .env / .env.local.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      origin = "54", // Default ID Kab. Bogor (Sukaraja)
      destination,
      weight = 5000, // Default 5kg
      courier = "jne",
    } = body;

    if (!destination) {
      return NextResponse.json(
        { success: false, error: "Parameter 'destination' (ID Kota/Kecamatan tujuan) wajib diisi." },
        { status: 400 }
      );
    }

    // 1. Try Komerce API V1 Domestic Cost Calculation
    try {
      const komerceBody = new URLSearchParams();
      komerceBody.append("origin", String(origin));
      komerceBody.append("destination", String(destination));
      komerceBody.append("weight", String(weight));
      komerceBody.append("courier", String(courier));

      const komerceRes = await fetch("https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost", {
        method: "POST",
        headers: {
          key: apiKey,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: komerceBody.toString(),
        cache: "no-store",
      });

      if (komerceRes.ok) {
        const komerceData = await komerceRes.json();
        const rawList = komerceData.data || komerceData.results || [];

        if (Array.isArray(rawList) && rawList.length > 0) {
          const services = rawList.map((item: any) => ({
            service: item.service || item.code || "REG",
            description: item.description || item.name || "Layanan Pengiriman",
            cost: typeof item.cost === "number" ? item.cost : (item.cost?.[0]?.value || 0),
            etd: item.etd ? String(item.etd) : "1-3 Hari",
          }));

          return NextResponse.json({
            success: true,
            source: "komerce",
            origin: { city_name: "Sukaraja (Kab. Bogor)" },
            destination: { city_name: "Tujuan" },
            services,
          });
        }
      }
    } catch {
      // Fallback
    }

    // 2. Fallback to Standard RajaOngkir Starter API
    const formData = new URLSearchParams();
    formData.append("origin", String(origin));
    formData.append("destination", String(destination));
    formData.append("weight", String(weight));
    formData.append("courier", String(courier));

    const response = await fetch("https://api.rajaongkir.com/starter/cost", {
      method: "POST",
      headers: {
        key: apiKey,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
      cache: "no-store",
    });

    const text = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Gagal memproses respon dari server RajaOngkir (Format bukan JSON).",
          raw: text,
        },
        { status: 400 }
      );
    }

    if (!response.ok || !data?.rajaongkir || data.rajaongkir.status?.code !== 200) {
      return NextResponse.json(
        {
          success: false,
          error:
            data?.rajaongkir?.status?.description ||
            "Gagal menghitung ongkos kirim. Pastikan API Key RajaOngkir valid.",
          details: data,
        },
        { status: 400 }
      );
    }

    const starterResults = data.rajaongkir.results?.[0]?.costs || [];
    const services = starterResults.map((item: any) => ({
      service: item.service,
      description: item.description,
      cost: item.cost?.[0]?.value || 0,
      etd: item.cost?.[0]?.etd || "1-3 Hari",
    }));

    return NextResponse.json({
      success: true,
      source: "starter",
      origin: data.rajaongkir.origin_details,
      destination: data.rajaongkir.destination_details,
      services,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
