import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { status, trackingNo, shippingCourier, shippingService, shippingCost, dpAmount, totalPrice } = body;

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
      // If status is changed to Cancelled, revert all linked products to Available
      if (status === "Cancelled") {
        await tx.product.updateMany({
          where: { orderId: id },
          data: {
            status: "Available",
            orderId: null,
          },
        });
      } else if (status === "Shipped") {
        // If status changed to Shipped, products become Sold
        await tx.product.updateMany({
          where: { orderId: id },
          data: {
            status: "Sold",
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
