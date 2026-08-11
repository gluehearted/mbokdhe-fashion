import { NextResponse } from "next/server";

// GET /api/config
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      id: "default",
      shopName: "Mbokdhe Fashion",
      senderName: "Admin Mbokdhe",
      senderPhone: "081234567890",
      province: "Jawa Barat",
      cityName: "Kabupaten Bogor",
      district: "Sukaraja",
      addressDetail: "Sukaraja, Kab. Bogor",
    },
  });
}

// POST /api/config
export async function POST() {
  return NextResponse.json({
    success: true,
    message: "Konfigurasi toko berhasil diperbarui.",
  });
}
