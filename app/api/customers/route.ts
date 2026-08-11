import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function generateAutoCustomerId(): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateCode = `${yy}${mm}${dd}`;
  const prefix = `CST-${dateCode}-`;

  const count = await prisma.customer.count({
    where: { id: { startsWith: prefix } },
  });

  let seq = count + 1;
  let candidate = `${prefix}${String(seq).padStart(2, "0")}`;

  while (await prisma.customer.findUnique({ where: { id: candidate } })) {
    seq++;
    candidate = `${prefix}${String(seq).padStart(2, "0")}`;
  }

  return candidate;
}

// GET /api/customers?search=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const customers = await prisma.customer.findMany({
      where: search
        ? {
            OR: [
              { id: { contains: search } },
              { name: { contains: search } },
              { whatsapp: { contains: search } },
              { domisili: { contains: search } },
              { courier: { contains: search } },
              { behavioral: { contains: search } },
              { consumerType: { contains: search } },
            ],
          }
        : undefined,
      include: {
        _count: {
          select: { orders: true },
        },
        orders: {
          select: {
            id: true,
            status: true,
            totalPrice: true,
            createdAt: true,
          },
        },
      },
      take: 100,
      orderBy: {
        createdAt: "desc",
      },
    });

    // Compute live totalSpending & totalTransactions if needed
    const mapped = customers.map((c) => {
      const ordersCount = c._count?.orders || 0;
      const calculatedSpending = c.orders.reduce((sum, o) => sum + (o.status !== "Cancelled" ? o.totalPrice : 0), 0);
      return {
        ...c,
        totalTransactions: c.totalTransactions || ordersCount,
        totalSpending: c.totalSpending || calculatedSpending,
      };
    });

    return NextResponse.json({
      success: true,
      data: mapped,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// POST /api/customers (Create new customer with auto CUST ID)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      whatsapp,
      domisili,
      shippingCost = 0,
      courier,
      addressDetail,
      behavioral,
      consumerType,
      relationshipStatus,
      crisisStatus,
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

    const customId = await generateAutoCustomerId();

    const newCustomer = await prisma.customer.create({
      data: {
        id: customId,
        name: name.trim(),
        whatsapp: cleanWhatsapp,
        domisili: domisili ? domisili.trim() : null,
        shippingCost: parseInt(String(shippingCost), 10) || 0,
        courier: courier ? courier.trim() : "JNE",
        addressDetail: addressDetail.trim(),
        behavioral: behavioral ? behavioral.trim() : "Loyal",
        consumerType: consumerType ? consumerType.trim() : "Retail",
        relationshipStatus: relationshipStatus ? relationshipStatus.trim() : "Active",
        crisisStatus: crisisStatus ? crisisStatus.trim() : "Normal",
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
