import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const orderId = resolvedParams.id;
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // 1. Ambil data order dari Supabase, beserta relasi data customer
    const { data: order, error } = await supabase
      .from("orders")
      .select("*, customer:customers(*)")
      .eq("id", orderId)
      .single();

    const customer = Array.isArray(order?.customer) ? order.customer[0] : order?.customer;

    if (error || !order || !customer) {
      return NextResponse.json({
        "0": { type: 0, content: "Data pesanan tidak ditemukan", bold: 0, align: 1, format: 0 }
      });
    }

    // 2. Ekstrak data pelanggan
    const customerName = customer.name || "-";
    const customerWA = customer.whatsapp || "-";
    const addressDetail = customer.addressDetail || "-";
    const domisili = customer.domisili || "-";
    const courier = order.shippingCourier || customer.courier || "Ekspedisi";

    // 3. Susun JSON murni sesuai format Bluetooth Print App
    const printData = [
      {
        type: 1, // Tipe 1 untuk gambar
        path: "https://csoeufwcicpbecqzffyu.supabase.co/storage/v1/object/public/assets/mbokdhe-fashion.jpeg",
        align: 1 // 1 untuk align center
      },
      { type: 0, content: "PENGIRIMAN PAKET", bold: 1, align: 1, format: 1 },
      { type: 0, content: "----------------------------------", bold: 0, align: 1, format: 0 },
      { type: 0, content: `Ekspedisi: ${courier.toUpperCase()}`, bold: 1, align: 0, format: 0 },
      { type: 0, content: " ", bold: 0, align: 0, format: 0 },
      { type: 0, content: "KEPADA (PENERIMA):", bold: 1, align: 0, format: 0 },
      { 
        type: 0, 
        // Menggunakan tag <br /> untuk teks multi-baris
        content: `Nama: ${customerName}<br />No. WA: ${customerWA}<br />Alamat: ${addressDetail}<br />DOMISILI / KOTA: ${domisili}`, 
        bold: 0, 
        align: 0, 
        format: 0 
      },
      { type: 0, content: "----------------------------------", bold: 0, align: 1, format: 0 },
      { type: 0, content: "DARI (PENGIRIM):", bold: 1, align: 0, format: 0 },
      { 
        type: 0, 
        content: "Mbokdhe Fashion<br />WA: 081234567890", // Bisa kamu sesuaikan
        bold: 0, 
        align: 0, 
        format: 0 
      },
      { type: 0, content: " ", bold: 0, align: 0, format: 0 },
      { type: 0, content: " ", bold: 0, align: 0, format: 0 }
    ];

    // 4. WAJIB: Konversi Array menjadi Object bernomor indeks 
    // (Ini meniru perilaku JSON_FORCE_OBJECT yang diwajibkan aplikasi Bluetooth Print)
    const formattedPrintData = Object.assign({}, printData);

    // Kembalikan Response dalam bentuk JSON Object, bukan Array
    return NextResponse.json(formattedPrintData, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      }
    });

  } catch (err) {
    console.error("Error generating print label:", err);
    // Jika ada error (catch), format response juga WAJIB berbentuk Object
    const errorData = {
      "0": { type: 0, content: "Error memproses data cetak", bold: 0, align: 1, format: 0 }
    };
    return NextResponse.json(errorData);
  }
}
