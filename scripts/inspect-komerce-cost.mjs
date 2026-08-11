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

async function inspectCost() {
  console.log("Testing Komerce Domestic Cost API with API Key:", apiKey);
  try {
    const bodyData = new URLSearchParams();
    bodyData.append("origin", "54");
    bodyData.append("destination", "338");
    bodyData.append("weight", "5000");
    bodyData.append("courier", "jne");

    const res = await fetch("https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost", {
      method: "POST",
      headers: {
        key: apiKey,
        "content-type": "application/x-www-form-urlencoded"
      },
      body: bodyData.toString()
    });

    const text = await res.text();
    console.log("HTTP Status:", res.status);
    console.log("Raw Response Body:", text);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

inspectCost();
