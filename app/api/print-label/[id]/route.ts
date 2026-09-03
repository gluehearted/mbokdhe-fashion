import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const orderId = resolvedParams.id;

    // BYPASS KEAMANAN: Gunakan url dan service_role_key atau anon_key bawaan environment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        {
          "0": { type: 0, content: "Supabase Key belum disetel di Vercel/Env", bold: 0, align: 1, format: 0 }
        },
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Ambil data order dari Supabase
    const { data: order, error } = await supabase
      .from("orders")
      .select("*, customer:customers(*)")
      .eq("id", orderId)
      .single();

    const customer = Array.isArray(order?.customer) ? order.customer[0] : order?.customer;

    if (error || !order || !customer) {
      return NextResponse.json(
        {
          "0": { type: 0, content: "Data pesanan tidak ditemukan di Database", bold: 0, align: 1, format: 0 }
        },
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        }
      );
    }

    // 2. Ekstrak data pelanggan
    const customerName = customer.name || "-";
    let rawWA = (customer.whatsapp || "").trim().replace(/\D/g, "");
    if (rawWA.startsWith("62")) {
      rawWA = "0" + rawWA.slice(2);
    } else if (rawWA.startsWith("8")) {
      rawWA = "0" + rawWA;
    }
    const customerWA = rawWA || "-";
    const addressDetail = customer.addressDetail || "-";
    const domisili = customer.domisili || "-";
    const courier = order.shippingCourier || customer.courier || "Ekspedisi";

    // 3. Susun data instruksi cetak
    const printData = [
      {
        type: 1,
        path: "https://csoeufwcicpbecqzffyu.supabase.co/storage/v1/object/public/assets/logo_mbokdhe.png",
        align: 1
      },
      { type: 0, content: "--------------------------------", bold: 0, align: 1, format: 0 },
      { type: 0, content: `Ekspedisi: ${courier.toUpperCase()}`, bold: 1, align: 0, format: 0 },
      { type: 0, content: " ", bold: 0, align: 0, format: 0 },
      { type: 0, content: "KEPADA (PENERIMA):", bold: 1, align: 0, format: 0 },
      { 
        type: 0, 
        content: `Nama: ${customerName}<br />No. WA: ${customerWA}<br />Alamat: ${addressDetail}<br />DOMISILI / KOTA: ${domisili}`, 
        bold: 0, 
        align: 0, 
        format: 0 
      },
    ];

    // Wajib ubah Array menjadi Object berindeks ("0": {...}, "1": {...})
    // (Ini meniru perilaku JSON_FORCE_OBJECT yang diwajibkan aplikasi Android Bluetooth Print)
    const formattedPrintData = Object.assign({}, printData);

    return NextResponse.json(formattedPrintData, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      }
    });

  } catch (err: unknown) {
    const errorObj = err as Error;
    return NextResponse.json({
      "0": { type: 0, content: `Server Error: ${errorObj.message}`, bold: 0, align: 1, format: 0 }
    }, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      }
    });
  }
}
