import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// GET /api/products?status=Available
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const whereClause = status ? { status } : {};

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        order: {
          select: {
            id: true,
            status: true,
            customer: {
              select: {
                name: true,
                whatsapp: true,
              },
            },
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: products,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// POST /api/products (multipart/form-data)
export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const id = formData.get("id") as string;
    const shopOrigin = formData.get("shopOrigin") as string;
    const capitalPrice = parseInt((formData.get("capitalPrice") as string) || "0", 10);
    const price = parseInt((formData.get("price") as string) || "0", 10);
    const file = formData.get("file") as File | null;

    if (!id || !shopOrigin || isNaN(price)) {
      return NextResponse.json(
        { success: false, error: "ID, shopOrigin, dan price (harga jual) wajib diisi." },
        { status: 400 }
      );
    }

    // Check if product ID already exists
    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Produk dengan ID ${id} sudah ada dalam database.` },
        { status: 400 }
      );
    }

    let photoUrl = "/uploads/placeholder.jpg";

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Determine extension
      const fileExt = path.extname(file.name) || ".jpg";
      const fileName = `${id.replace(/[^a-zA-Z0-9_-]/g, "")}${fileExt}`;
      const uploadsDir = path.join(process.cwd(), "public", "uploads");

      await mkdir(uploadsDir, { recursive: true });
      const filePath = path.join(uploadsDir, fileName);

      await writeFile(filePath, buffer);
      photoUrl = `/uploads/${fileName}`;
    }

    const product = await prisma.product.create({
      data: {
        id,
        shopOrigin,
        capitalPrice,
        price,
        photoUrl,
        status: "Available",
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: product,
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
