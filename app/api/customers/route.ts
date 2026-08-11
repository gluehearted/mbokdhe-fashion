import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/customers?search=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const customers = await prisma.customer.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search } },
              { whatsapp: { contains: search } },
              { province: { contains: search } },
              { cityName: { contains: search } },
              { district: { contains: search } },
            ],
          }
        : undefined,
      include: {
        _count: {
          select: { orders: true },
        },
        orders: {
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            totalPrice: true,
            createdAt: true,
          },
        },
      },
      take: 50,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: customers,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// POST /api/customers (Create new customer with full address detail)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      whatsapp,
      province,
      cityName,
      cityId,
      district,
      subdistrict,
      postalCode,
      addressDetail,
    } = body;

    if (!name || !whatsapp || !addressDetail) {
      return NextResponse.json(
        { success: false, error: "Nama, WhatsApp, dan Detail Alamat wajib diisi." },
        { status: 400 }
      );
    }

    const cleanWhatsapp = String(whatsapp).trim().replace(/[^0-9]/g, "");

    const existing = await prisma.customer.findUnique({
      where: { whatsapp: cleanWhatsapp },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Pelanggan dengan nomor WhatsApp ${cleanWhatsapp} sudah terdaftar.` },
        { status: 400 }
      );
    }

    const newCustomer = await prisma.customer.create({
      data: {
        name,
        whatsapp: cleanWhatsapp,
        province: province || "",
        cityName: cityName || "",
        cityId: cityId ? parseInt(String(cityId), 10) : 338,
        district: district || "",
        subdistrict: subdistrict || "",
        postalCode: postalCode || "",
        addressDetail,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: newCustomer,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
