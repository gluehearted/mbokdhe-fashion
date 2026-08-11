import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/customers/[id]
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          include: {
            products: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Pelanggan tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: customer,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// PATCH /api/customers/[id]
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const {
      name,
      whatsapp,
      domisili,
      shippingCost,
      courier,
      addressDetail,
      behavioral,
      consumerType,
      relationshipStatus,
      crisisStatus,
      totalSpending,
      totalTransactions,
    } = body;

    const existing = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Pelanggan tidak ditemukan." },
        { status: 404 }
      );
    }

    let cleanWhatsapp: string | undefined;
    if (whatsapp) {
      cleanWhatsapp = String(whatsapp).trim().replace(/[^0-9]/g, "");
      if (cleanWhatsapp !== existing.whatsapp) {
        const checkWa = await prisma.customer.findUnique({
          where: { whatsapp: cleanWhatsapp },
        });
        if (checkWa) {
          return NextResponse.json(
            { success: false, error: `Nomor WhatsApp ${cleanWhatsapp} sudah digunakan pelanggan lain.` },
            { status: 400 }
          );
        }
      }
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(cleanWhatsapp && { whatsapp: cleanWhatsapp }),
        ...(domisili !== undefined && { domisili: domisili ? domisili.trim() : null }),
        ...(shippingCost !== undefined && { shippingCost: parseInt(String(shippingCost), 10) }),
        ...(courier !== undefined && { courier: courier ? courier.trim() : null }),
        ...(addressDetail && { addressDetail: addressDetail.trim() }),
        ...(behavioral !== undefined && { behavioral: behavioral ? behavioral.trim() : null }),
        ...(consumerType !== undefined && { consumerType: consumerType ? consumerType.trim() : null }),
        ...(relationshipStatus !== undefined && { relationshipStatus: relationshipStatus ? relationshipStatus.trim() : null }),
        ...(crisisStatus !== undefined && { crisisStatus: crisisStatus ? crisisStatus.trim() : null }),
        ...(totalSpending !== undefined && { totalSpending: parseInt(String(totalSpending), 10) }),
        ...(totalTransactions !== undefined && { totalTransactions: parseInt(String(totalTransactions), 10) }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// DELETE /api/customers/[id]
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Pelanggan tidak ditemukan." },
        { status: 404 }
      );
    }

    // Cascade deletion: Delete customer and their orders, but retain products (unlinked & set to Tersedia)
    await prisma.$transaction(async (tx) => {
      const orders = await tx.order.findMany({
        where: { customerId: id },
        select: { id: true },
      });

      const orderIds = orders.map((o) => o.id);

      if (orderIds.length > 0) {
        // Unlink products, set status back to "Tersedia"
        await tx.product.updateMany({
          where: { orderId: { in: orderIds } },
          data: {
            orderId: null,
            status: "Tersedia",
          },
        });

        // Delete all orders for this customer
        await tx.order.deleteMany({
          where: { customerId: id },
        });
      }

      // Delete customer record
      await tx.customer.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Pelanggan '${customer.name}' beserta seluruh riwayat pesanan berhasil dihapus (produk dikembalikan ke etalase Tersedia).`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
