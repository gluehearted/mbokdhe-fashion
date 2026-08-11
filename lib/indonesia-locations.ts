export interface LocationHierarchy {
  province: string;
  cities: {
    cityId: number;
    cityName: string;
    type: "Kota" | "Kabupaten";
    districts: {
      districtName: string;
      subdistricts: {
        subdistrictName: string;
        postalCode: string;
      }[];
    }[];
  }[];
}

export interface FlatLocation {
  province: string;
  cityId: number;
  cityName: string;
  type: string;
  district: string;
  subdistrict: string;
  postalCode: string;
  label: string; // Format: "SUBDISTRICT, DISTRICT, CITY, POSTAL_CODE"
}

export const INDONESIA_LOCATIONS: LocationHierarchy[] = [
  {
    province: "Jawa Barat",
    cities: [
      {
        cityId: 54,
        cityName: "Kabupaten Bogor",
        type: "Kabupaten",
        districts: [
          {
            districtName: "Sukaraja",
            subdistricts: [
              { subdistrictName: "Cikeas", postalCode: "16710" },
              { subdistrictName: "Cijujung", postalCode: "16710" },
              { subdistrictName: "Sukaraja", postalCode: "16710" },
              { subdistrictName: "Nagrak", postalCode: "16710" },
            ],
          },
          {
            districtName: "Cibinong",
            subdistricts: [
              { subdistrictName: "Cibinong", postalCode: "16911" },
              { subdistrictName: "Cirimekar", postalCode: "16912" },
              { subdistrictName: "Pakansari", postalCode: "16915" },
            ],
          },
          {
            districtName: "Kedung Halang",
            subdistricts: [
              { subdistrictName: "Kedung Halang", postalCode: "16158" },
              { subdistrictName: "Cibuluh", postalCode: "16157" },
            ],
          },
        ],
      },
      {
        cityId: 55,
        cityName: "Kota Bogor",
        type: "Kota",
        districts: [
          {
            districtName: "Tanah Sereal",
            subdistricts: [
              { subdistrictName: "Kedung Badak", postalCode: "16164" },
              { subdistrictName: "Tanah Sareal", postalCode: "16161" },
              { subdistrictName: "Kedung Jaya", postalCode: "16164" },
            ],
          },
          {
            districtName: "Bogor Tengah",
            subdistricts: [
              { subdistrictName: "Paledang", postalCode: "16122" },
              { subdistrictName: "Babakan", postalCode: "16128" },
            ],
          },
        ],
      },
      {
        cityId: 23,
        cityName: "Kota Bandung",
        type: "Kota",
        districts: [
          {
            districtName: "Coblong",
            subdistricts: [
              { subdistrictName: "Dago", postalCode: "40135" },
              { subdistrictName: "Lebak Siliwangi", postalCode: "40132" },
              { subdistrictName: "Sadang Serang", postalCode: "40133" },
            ],
          },
          {
            districtName: "Sumur Bandung",
            subdistricts: [
              { subdistrictName: "Braga", postalCode: "40111" },
              { subdistrictName: "Kebon Pisang", postalCode: "40112" },
            ],
          },
        ],
      },
    ],
  },
  {
    province: "Riau",
    cities: [
      {
        cityId: 338,
        cityName: "Kota Pekanbaru",
        type: "Kota",
        districts: [
          {
            districtName: "Pekanbaru Kota",
            subdistricts: [
              { subdistrictName: "Kota Baru", postalCode: "28114" },
              { subdistrictName: "Sumahilang", postalCode: "28111" },
              { subdistrictName: "Simpang Empat", postalCode: "28116" },
            ],
          },
          {
            districtName: "Tampan",
            subdistricts: [
              { subdistrictName: "Delima", postalCode: "28289" },
              { subdistrictName: "Sidomulyo Barat", postalCode: "28289" },
              { subdistrictName: "Tuah Karya", postalCode: "28289" },
            ],
          },
          {
            districtName: "Marpoyan Damai",
            subdistricts: [
              { subdistrictName: "Maharatu", postalCode: "28125" },
              { subdistrictName: "Tangkerang Tengah", postalCode: "28128" },
            ],
          },
          {
            districtName: "Sukajadi",
            subdistricts: [
              { subdistrictName: "Harjosari", postalCode: "28122" },
              { subdistrictName: "Kampung Melayu", postalCode: "28124" },
            ],
          },
        ],
      },
      {
        cityId: 128,
        cityName: "Kota Dumai",
        type: "Kota",
        districts: [
          {
            districtName: "Dumai Timur",
            subdistricts: [
              { subdistrictName: "Bintan", postalCode: "28812" },
              { subdistrictName: "Buluh Kasap", postalCode: "28814" },
            ],
          },
        ],
      },
    ],
  },
  {
    province: "DKI Jakarta",
    cities: [
      {
        cityId: 152,
        cityName: "Kota Jakarta Pusat",
        type: "Kota",
        districts: [
          {
            districtName: "Tanah Abang",
            subdistricts: [
              { subdistrictName: "Karet Tengsin", postalCode: "10220" },
              { subdistrictName: "Bendungan Hilir", postalCode: "10210" },
              { subdistrictName: "Kebon Kacang", postalCode: "10240" },
            ],
          },
          {
            districtName: "Menteng",
            subdistricts: [
              { subdistrictName: "Cikini", postalCode: "10330" },
              { subdistrictName: "Gondangdia", postalCode: "10350" },
            ],
          },
        ],
      },
      {
        cityId: 153,
        cityName: "Kota Jakarta Selatan",
        type: "Kota",
        districts: [
          {
            districtName: "Kebayoran Baru",
            subdistricts: [
              { subdistrictName: "Senayan", postalCode: "12190" },
              { subdistrictName: "Gunung", postalCode: "12120" },
            ],
          },
        ],
      },
    ],
  },
  {
    province: "Jawa Timur",
    cities: [
      {
        cityId: 444,
        cityName: "Kota Surabaya",
        type: "Kota",
        districts: [
          {
            districtName: "Gubeng",
            subdistricts: [
              { subdistrictName: "Airlangga", postalCode: "60286" },
              { subdistrictName: "Kertajaya", postalCode: "60282" },
            ],
          },
          {
            districtName: "Tegalsari",
            subdistricts: [
              { subdistrictName: "Kedungdoro", postalCode: "60261" },
              { subdistrictName: "Wonorejo", postalCode: "60263" },
            ],
          },
        ],
      },
    ],
  },
  {
    province: "Sumatera Utara",
    cities: [
      {
        cityId: 278,
        cityName: "Kota Medan",
        type: "Kota",
        districts: [
          {
            districtName: "Medan Baru",
            subdistricts: [
              { subdistrictName: "Padang Bulan", postalCode: "20154" },
              { subdistrictName: "Merdeka", postalCode: "20153" },
            ],
          },
        ],
      },
    ],
  },
];

// Cached flat locations array for fast searching
let flatCache: FlatLocation[] | null = null;

export function getAllFlatLocations(): FlatLocation[] {
  if (flatCache) return flatCache;

  const results: FlatLocation[] = [];

  for (const prov of INDONESIA_LOCATIONS) {
    for (const city of prov.cities) {
      const cityClean = city.cityName.replace(/^(Kota|Kabupaten)\s+/i, "");
      for (const dist of city.districts) {
        for (const sub of dist.subdistricts) {
          // Format label matching screenshot: KEDUNG BADAK, TANAH SEREAL, BOGOR, 16164
          const label = `${sub.subdistrictName.toUpperCase()}, ${dist.districtName.toUpperCase()}, ${cityClean.toUpperCase()}, ${sub.postalCode}`;
          results.push({
            province: prov.province,
            cityId: city.cityId,
            cityName: city.cityName,
            type: city.type,
            district: dist.districtName,
            subdistrict: sub.subdistrictName,
            postalCode: sub.postalCode,
            label,
          });
        }
      }
    }
  }

  flatCache = results;
  return results;
}

export function searchLocations(query: string, limit = 20): FlatLocation[] {
  const list = getAllFlatLocations();
  if (!query || !query.trim()) {
    return list.slice(0, limit);
  }

  const q = query.toLowerCase().trim();
  const tokens = q.split(/\s+/);

  return list
    .filter((loc) => {
      const fullStr = `${loc.label} ${loc.province} ${loc.cityName} ${loc.district} ${loc.subdistrict} ${loc.postalCode}`.toLowerCase();
      return tokens.every((token) => fullStr.includes(token));
    })
    .slice(0, limit);
}
