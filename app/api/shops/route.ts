import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/shops
export async function GET() {
  try {
    const shops = await prisma.shop.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: shops,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// POST /api/shops
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Nama Toko wajib diisi." },
        { status: 400 }
      );
    }

    const cleanName = name.trim();

    const existing = await prisma.shop.findUnique({
      where: { name: cleanName },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Toko '${cleanName}' sudah terdaftar dalam database.` },
        { status: 400 }
      );
    }

    const shop = await prisma.shop.create({
      data: { name: cleanName },
    });

    return NextResponse.json(
      { success: true, message: `Toko '${cleanName}' berhasil ditambahkan.`, data: shop },
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
