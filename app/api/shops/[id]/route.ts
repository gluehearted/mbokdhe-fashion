import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/shops/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Nama Toko tidak boleh kosong." },
        { status: 400 }
      );
    }

    const cleanName = name.trim();

    const updated = await prisma.shop.update({
      where: { id },
      data: { name: cleanName },
    });

    return NextResponse.json({
      success: true,
      message: "Nama toko berhasil diperbarui.",
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

// DELETE /api/shops/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.shop.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Toko berhasil dihapus dari database.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
