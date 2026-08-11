import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// GET /api/products?status=Tersedia
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // Support legacy "Available" filter mapped to "Tersedia"
    let mappedStatus = status;
    if (status === "Available") mappedStatus = "Tersedia";
    if (status === "Booked") mappedStatus = "Dibooking";
    if (status === "Sold") mappedStatus = "Terjual";

    const whereClause = mappedStatus ? { status: mappedStatus } : {};

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        shop: true,
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

async function generateAutoProductId(shopOrigin: string): Promise<string> {
  const cleanShop = shopOrigin.trim().replace(/[()]/g, "");
  const words = cleanShop.split(/\s+/).filter(Boolean);
  let prefix = "TAS";
  if (words.length >= 2) {
    prefix = words.map((w) => w[0].toUpperCase()).join("").slice(0, 4);
  } else if (cleanShop.length >= 3) {
    prefix = cleanShop.slice(0, 3).toUpperCase();
  } else if (cleanShop.length > 0) {
    prefix = cleanShop.toUpperCase();
  }

  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateCode = `${yy}${mm}${dd}`;

  const datePrefix = `${prefix}-${dateCode}-`;
  const existingCount = await prisma.product.count({
    where: {
      id: {
        startsWith: datePrefix,
      },
    },
  });

  let seq = existingCount + 1;
  let candidate = `${datePrefix}${String(seq).padStart(2, "0")}`;

  while (await prisma.product.findUnique({ where: { id: candidate } })) {
    seq++;
    candidate = `${datePrefix}${String(seq).padStart(2, "0")}`;
  }

  return candidate;
}

// POST /api/products (multipart/form-data)
export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    let id = (formData.get("id") as string || "").trim();
    const shopOrigin = (formData.get("shopOrigin") as string || "").trim();
    const capitalPrice = parseInt((formData.get("capitalPrice") as string) || "0", 10);
    const price = parseInt((formData.get("price") as string) || "0", 10);
    const file = formData.get("file") as File | null;

    if (!shopOrigin || isNaN(price) || price <= 0) {
      return NextResponse.json(
        { success: false, error: "shopOrigin (Toko Asal) dan price (harga jual) wajib diisi." },
        { status: 400 }
      );
    }

    // Auto-generate ID if not provided
    if (!id) {
      id = await generateAutoProductId(shopOrigin);
    } else {
      const existing = await prisma.product.findUnique({
        where: { id },
      });

      if (existing) {
        return NextResponse.json(
          { success: false, error: `Produk dengan ID ${id} sudah ada dalam database.` },
          { status: 400 }
        );
      }
    }

    // 1-to-Many Relation: Find or create Shop to link shopId
    let shopObj = await prisma.shop.findUnique({ where: { name: shopOrigin } });
    if (!shopObj) {
      shopObj = await prisma.shop.create({ data: { name: shopOrigin } });
    }

    let photoUrl = "/uploads/placeholder.jpg";

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

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
        shopId: shopObj.id,
        shopOrigin,
        capitalPrice,
        price,
        status: "Tersedia",
        photoUrl,
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
