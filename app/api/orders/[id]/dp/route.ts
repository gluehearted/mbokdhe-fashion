import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { dpAmount, notes } = body;

    const parsedDp = parseInt(String(dpAmount), 10);

    if (isNaN(parsedDp) || parsedDp <= 0) {
      return NextResponse.json(
        { success: false, error: "Nominal DP harus angka positif yang valid." },
        { status: 400 }
      );
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: "Order tidak ditemukan." },
        { status: 404 }
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        dpAmount: parsedDp,
        dpDate: new Date(),
        status: "DP",
        dpForfeited: false,
        ...(notes && { notes }),
      },
      include: {
        customer: true,
        products: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: `DP sebesar Rp ${parsedDp.toLocaleString("id-ID")} berhasil dicatat.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
