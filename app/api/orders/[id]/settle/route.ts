import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: { products: true },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: "Order tidak ditemukan." },
        { status: 404 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Update order status to "Siap Packing"
      const order = await tx.order.update({
        where: { id },
        data: {
          status: "Siap Packing",
          notes: `Lunas pada ${new Date().toLocaleDateString("id-ID")}`,
        },
        include: {
          customer: true,
          products: true,
        },
      });

      // Mark attached products as "Terjual"
      await tx.product.updateMany({
        where: { orderId: id },
        data: {
          status: "Terjual",
        },
      });

      return order;
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Pesanan ID ${id} berhasil dilunasi dan masuk antrean Siap Packing.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
