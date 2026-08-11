import fs from 'fs';
import path from 'path';

let apiKey = process.env.NEXT_PUBLIC_RAJAONGKIR_API_KEY || process.env.RAJAONGKIR_API_KEY;

if (!apiKey || apiKey.includes("masukkan") || apiKey.includes("tempel")) {
  for (const file of ['.env', '.env.local']) {
    const envPath = path.join(process.cwd(), file);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const match = content.match(/RAJAONGKIR_API_KEY=(.+)/) || content.match(/NEXT_PUBLIC_RAJAONGKIR_API_KEY=(.+)/);
      if (match && match[1] && !match[1].includes("masukkan") && !match[1].includes("tempel")) {
        apiKey = match[1].trim();
        break;
      }
    }
  }
}

console.log("==================================================");
console.log(" 📦 RAJAONGKIR (KOMERCE / STARTER) TESTER");
console.log("==================================================");

console.log(`🔑 API Key Terdeteksi: ${apiKey ? apiKey.substring(0, 6) + '...' + apiKey.slice(-4) : 'Kosong'}`);

async function testRajaOngkir() {
  if (!apiKey) return;

  console.log("\n--------------------------------------------------");
  console.log("1. Menguji Komerce API (rajaongkir.komerce.id)...");
  try {
    const resKomerce = await fetch(`https://rajaongkir.komerce.id/api/v1/destination/domestic-destination?search=pekanbaru&limit=5`, {
      headers: { key: apiKey }
    });
    const dataK = await resKomerce.json();
    if (resKomerce.ok) {
      console.log("✅ BERHASIL CONNECT KE RAJAONGKIR KOMERCE API!");
      console.log("   Status:", dataK.status || "OK");
      console.log("   Hasil Lokasi:", dataK.data?.[0]?.label || JSON.stringify(dataK.data?.[0]));
    } else {
      console.log("⚠️ Respon Komerce non-200:", dataK);
    }
  } catch (err) {
    console.log("❌ Komerce fetch error:", err.message);
  }

  console.log("\n--------------------------------------------------");
  console.log("2. Menguji Standard RajaOngkir API (api.rajaongkir.com)...");
  try {
    const resStarter = await fetch(`https://api.rajaongkir.com/starter/city`, {
      headers: { key: apiKey }
    });
    const dataS = await resStarter.json();
    if (resStarter.ok) {
      console.log("✅ BERHASIL CONNECT KE STANDARD RAJAONGKIR STARTER!");
      console.log("   Status Code:", dataS.rajaongkir?.status?.code);
    } else {
      console.log("⚠️ Respon Starter non-200:", dataS.rajaongkir?.status?.description || dataS);
    }
  } catch (err) {
    console.log("❌ Starter fetch error:", err.message);
  }

  console.log("\n==================================================");
}

testRajaOngkir();
