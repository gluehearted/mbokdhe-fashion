import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { reason = "Batas waktu DP habis / Batal Hit & Run" } = body;

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
      // 1. Mark order as Dibatalkan and DP as forfeited
      const order = await tx.order.update({
        where: { id },
        data: {
          status: "Dibatalkan",
          dpForfeited: true,
          notes: `DP Rp ${existingOrder.dpAmount.toLocaleString("id-ID")} HANGUS/FORFEIT. Alasan: ${reason}`,
        },
        include: {
          customer: true,
          products: true,
        },
      });

      // 2. Revert products back to "Tersedia" in etalase
      await tx.product.updateMany({
        where: { orderId: id },
        data: {
          status: "Tersedia",
          orderId: null,
        },
      });

      return order;
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: `DP Rp ${existingOrder.dpAmount.toLocaleString("id-ID")} telah dicatat Hangus (Forfeit). Produk berhasil dikembalikan ke etalase Tersedia.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
