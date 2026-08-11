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
      weight = 1000, // Default 1kg
      courier = "jne",
    } = body;

    if (!destination) {
      return NextResponse.json(
        { success: false, error: "Parameter 'destination' (ID Kota/Kecamatan tujuan) wajib diisi." },
        { status: 400 }
      );
    }

    // 1. Komerce City-Level Domestic Cost Calculation (/api/v1/calculate/domestic-cost)
    try {
      const komerceBody = new URLSearchParams();
      komerceBody.append("origin", String(origin));
      komerceBody.append("destination", String(destination));
      komerceBody.append("weight", String(weight));
      komerceBody.append("courier", String(courier).toLowerCase());

      const komerceRes = await fetch("https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost", {
        method: "POST",
        headers: {
          key: apiKey,
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: komerceBody.toString(),
        cache: "no-store",
      });

      if (komerceRes.ok) {
        const komerceData = await komerceRes.json();
        const rawList = komerceData.data || komerceData.results || [];

        if (Array.isArray(rawList) && rawList.length > 0) {
          const mappedServices = rawList.map((item: any) => {
            const svcCode = item.service || item.code || "REG";
            const costVal = typeof item.cost === "number" ? item.cost : (item.cost?.[0]?.value || item.price || 0);
            const isCargo = svcCode.toLowerCase().includes("jtr") || svcCode.toLowerCase().includes("cargo") || svcCode.toLowerCase().includes("trucking");

            return {
              service: svcCode,
              description: isCargo ? `${item.description || item.name} (Min. Cargo)` : (item.description || item.name || "Layanan Reguler"),
              cost: costVal,
              etd: item.etd ? String(item.etd) : "1-3 Hari",
              isCargo,
            };
          });

          // Sort so regular services (REG/EZ) come FIRST, and expensive cargo/JTR comes last
          mappedServices.sort((a: any, b: any) => {
            if (a.isCargo && !b.isCargo) return 1;
            if (!a.isCargo && b.isCargo) return -1;
            return a.cost - b.cost;
          });

          return NextResponse.json({
            success: true,
            source: "komerce",
            origin: { city_name: "Sukaraja (Kab. Bogor)" },
            destination: { city_name: "Tujuan" },
            services: mappedServices,
          });
        }
      }
    } catch {
      // Fallback
    }

    // 2. Try Komerce District Domestic Cost Calculation (/api/v1/calculate/district/domestic-cost)
    try {
      const komerceBody = new URLSearchParams();
      komerceBody.append("origin", String(origin));
      komerceBody.append("destination", String(destination));
      komerceBody.append("weight", String(weight));
      komerceBody.append("courier", String(courier).toLowerCase());

      const komerceRes = await fetch("https://rajaongkir.komerce.id/api/v1/calculate/district/domestic-cost", {
        method: "POST",
        headers: {
          key: apiKey,
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: komerceBody.toString(),
        cache: "no-store",
      });

      if (komerceRes.ok) {
        const komerceData = await komerceRes.json();
        const rawList = komerceData.data || komerceData.results || [];

        if (Array.isArray(rawList) && rawList.length > 0) {
          const mappedServices = rawList.map((item: any) => {
            const svcCode = item.service || item.code || "REG";
            const costVal = typeof item.cost === "number" ? item.cost : (item.cost?.[0]?.value || item.price || 0);
            const isCargo = svcCode.toLowerCase().includes("jtr") || svcCode.toLowerCase().includes("cargo") || svcCode.toLowerCase().includes("trucking");

            return {
              service: svcCode,
              description: isCargo ? `${item.description || item.name} (Min. Cargo)` : (item.description || item.name || "Layanan Reguler"),
              cost: costVal,
              etd: item.etd ? String(item.etd) : "1-3 Hari",
              isCargo,
            };
          });

          mappedServices.sort((a: any, b: any) => {
            if (a.isCargo && !b.isCargo) return 1;
            if (!a.isCargo && b.isCargo) return -1;
            return a.cost - b.cost;
          });

          return NextResponse.json({
            success: true,
            source: "komerce-district",
            origin: { city_name: "Sukaraja (Kab. Bogor)" },
            destination: { city_name: "Tujuan" },
            services: mappedServices,
          });
        }
      }
    } catch {
      // Ignore
    }

    // 3. Fallback to Standard RajaOngkir Starter API
    const formData = new URLSearchParams();
    formData.append("origin", String(origin));
    formData.append("destination", String(destination));
    formData.append("weight", String(weight));
    formData.append("courier", String(courier).toLowerCase());

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
          error: "Gagal memproses respon dari server RajaOngkir.",
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

    services.sort((a: any, b: any) => a.cost - b.cost);

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
