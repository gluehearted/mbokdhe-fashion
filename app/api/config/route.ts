import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/config (Fetch Admin Origin Address Config)
export async function GET() {
  try {
    let config = await prisma.shopConfig.findUnique({
      where: { id: "default" },
    });

    if (!config) {
      config = await prisma.shopConfig.create({
        data: {
          id: "default",
          shopName: "Mbokdhe Fashion",
          senderName: "Admin Mbokdhe",
          senderPhone: "081234567890",
          province: "Jawa Barat",
          cityName: "Kabupaten Bogor",
          originCityId: 54,
          district: "Sukaraja",
          subdistrict: "Cijujung",
          postalCode: "16710",
          addressDetail: "Perum Kostrad Cijujung Permai Blok D.1",
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// POST /api/config (Update Admin Origin Address Config)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      shopName,
      senderName,
      senderPhone,
      province,
      cityName,
      originCityId,
      district,
      subdistrict,
      postalCode,
      addressDetail,
    } = body;

    const config = await prisma.shopConfig.upsert({
      where: { id: "default" },
      update: {
        ...(shopName && { shopName }),
        ...(senderName && { senderName }),
        ...(senderPhone && { senderPhone }),
        ...(province && { province }),
        ...(cityName && { cityName }),
        ...(originCityId && { originCityId: parseInt(String(originCityId), 10) }),
        ...(district && { district }),
        ...(subdistrict && { subdistrict }),
        ...(postalCode && { postalCode }),
        ...(addressDetail && { addressDetail }),
      },
      create: {
        id: "default",
        shopName: shopName || "Mbokdhe Fashion",
        senderName: senderName || "Admin Mbokdhe",
        senderPhone: senderPhone || "081234567890",
        province: province || "Jawa Barat",
        cityName: cityName || "Kabupaten Bogor",
        originCityId: originCityId ? parseInt(String(originCityId), 10) : 54,
        district: district || "Sukaraja",
        subdistrict: subdistrict || "Cijujung",
        postalCode: postalCode || "16710",
        addressDetail: addressDetail || "Perum Kostrad Cijujung Permai Blok D.1",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Alamat asal pengiriman Admin berhasil diperbarui.",
      data: config,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
