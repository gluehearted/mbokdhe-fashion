import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");

    const whereClause: any = {};
    if (status) {
      if (status === "Keep") whereClause.status = "Menunggu";
      else if (status === "Siap_Packing") whereClause.status = "Siap Packing";
      else if (status === "Shipped") whereClause.status = "Dikirim";
      else if (status === "Cancelled") whereClause.status = "Dibatalkan";
      else whereClause.status = status;
    }
    if (customerId) whereClause.customerId = customerId;

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        customer: true,
        products: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let {
      customerId,
      customerData,
      productIds,
      customPrices,
      status = "Menunggu",
      shippingCourier,
      shippingService,
      shippingCost = 0,
      totalWeightGram = 1000,
      dpAmount = 0,
      trackingNo,
      notes,
    } = body;

    // Map legacy status strings to Indonesian equivalents
    if (status === "Keep") status = "Menunggu";
    if (status === "Siap_Packing" || status === "Siap_Kirim" || status === "Siap Packing") status = "Siap Kirim";
    if (status === "Shipped") status = "Dikirim";
    if (status === "Cancelled") status = "Dibatalkan";

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pilih minimal 1 produk untuk membuat order." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      let finalCustomerId = customerId;

      if (!finalCustomerId && customerData) {
        const cleanWa = String(customerData.whatsapp).trim().replace(/[^0-9]/g, "");
        const customer = await tx.customer.upsert({
          where: { whatsapp: cleanWa },
          update: {
            name: customerData.name,
            addressDetail: customerData.addressDetail,
            domisili: customerData.domisili || null,
          },
          create: {
            id: customerData.id || `CST-${Date.now()}`,
            name: customerData.name,
            whatsapp: cleanWa,
            addressDetail: customerData.addressDetail,
            domisili: customerData.domisili || null,
          },
        });
        finalCustomerId = customer.id;
      }

      if (!finalCustomerId) {
        throw new Error("Pelanggan (Customer) wajib dipilih atau diisi datanya.");
      }

      if (customPrices && typeof customPrices === "object") {
        for (const pId of productIds) {
          if (customPrices[pId] !== undefined) {
            const newPrice = parseInt(String(customPrices[pId]), 10);
            if (!isNaN(newPrice) && newPrice >= 0) {
              const pOrig = await tx.product.findUnique({ where: { id: pId } });
              const discAmount = pOrig ? Math.max(0, pOrig.price - newPrice) : 0;
              await tx.product.update({
                where: { id: pId },
                data: {
                  price: newPrice,
                  discount: discAmount,
                },
              });
            }
          }
        }
      }

      const productsToBook = await tx.product.findMany({
        where: {
          id: { in: productIds },
        },
      });

      const unavailable = productsToBook.filter((p) => p.status !== "Tersedia" && p.status !== "Available");
      if (unavailable.length > 0) {
        throw new Error(
          `Produk [${unavailable.map((p) => p.id).join(", ")}] sedang tidak tersedia.`
        );
      }

      const productsPriceSum = productsToBook.reduce((acc, p) => acc + p.price, 0);
      const finalTotalPrice = productsPriceSum + parseInt(String(shippingCost), 10);
      const parsedDp = parseInt(String(dpAmount), 10);

      let initialStatus = status;
      if (parsedDp > 0 && (initialStatus === "Menunggu" || initialStatus === "Keep")) {
        initialStatus = "DP";
      }

      const newOrder = await tx.order.create({
        data: {
          customerId: finalCustomerId,
          status: initialStatus,
          shippingCourier,
          shippingService,
          shippingCost: parseInt(String(shippingCost), 10),
          totalWeightGram: parseInt(String(totalWeightGram), 10) || 1000,
          dpAmount: parsedDp,
          dpDate: parsedDp > 0 ? new Date() : null,
          totalPrice: finalTotalPrice,
          trackingNo: trackingNo || null,
          notes: notes || null,
        },
      });

      // Update products status to "Dibooking" and link orderId
      await tx.product.updateMany({
        where: {
          id: { in: productIds },
        },
        data: {
          status: "Dibooking",
          orderId: newOrder.id,
        },
      });

      return tx.order.findUnique({
        where: { id: newOrder.id },
        include: {
          customer: true,
          products: true,
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
