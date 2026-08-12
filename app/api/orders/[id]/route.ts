import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    let { status, trackingNo, shippingCourier, shippingService, shippingCost, dpAmount, totalPrice } = body;

    // Map status string if provided in English
    if (status === "Keep") status = "Menunggu";
    if (status === "Siap_Packing" || status === "Siap_Kirim" || status === "Siap Packing") status = "Siap Kirim";
    if (status === "Shipped") status = "Dikirim";
    if (status === "Cancelled") status = "Dibatalkan";

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: { products: true },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: "Pesanan tidak ditemukan." },
        { status: 404 }
      );
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // If status is changed to Dibatalkan/Cancelled, revert all linked products to Tersedia
      if (status === "Dibatalkan" || status === "Cancelled") {
        await tx.product.updateMany({
          where: { orderId: id },
          data: {
            status: "Tersedia",
            orderId: null,
          },
        });
      } else if (status === "Dikirim" || status === "Shipped") {
        // If status changed to Dikirim, products become Terjual
        await tx.product.updateMany({
          where: { orderId: id },
          data: {
            status: "Terjual",
          },
        });
      }

      const order = await tx.order.update({
        where: { id },
        data: {
          ...(status && { status }),
          ...(trackingNo !== undefined && { trackingNo }),
          ...(shippingCourier !== undefined && { shippingCourier }),
          ...(shippingService !== undefined && { shippingService }),
          ...(shippingCost !== undefined && { shippingCost: parseInt(String(shippingCost), 10) }),
          ...(dpAmount !== undefined && { dpAmount: parseInt(String(dpAmount), 10) }),
          ...(totalPrice !== undefined && { totalPrice: parseInt(String(totalPrice), 10) }),
        },
        include: {
          customer: true,
          products: true,
        },
      });

      return order;
    });

    return NextResponse.json({
      success: true,
      data: updatedOrder,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        products: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Pesanan tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
