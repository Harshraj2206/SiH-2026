/**
 * LANDSAFE - Global Geographic Hierarchy Dataset
 * Provides comprehensive Country -> State/Province -> Regional Coordinates for Global Landslide & Disaster Intelligence.
 */

export const GLOBAL_GEOGRAPHY = {
  "India": {
    code: "IN",
    center: [20.5937, 78.9629],
    zoom: 5,
    states: {
      "Meghalaya": { center: [25.5788, 91.8933], zoom: 9, region: "Himalayan Foothills & Shillong Plateau" },
      "Sikkim": { center: [27.5330, 88.5122], zoom: 9, region: "Eastern Himalayas" },
      "Himachal Pradesh": { center: [31.1048, 77.1734], zoom: 8, region: "Western Himalayas" },
      "Uttarakhand": { center: [30.0668, 79.0193], zoom: 8, region: "Garhwal & Kumaon Himalayas" },
      "Kerala": { center: [10.8505, 76.2711], zoom: 8, region: "Western Ghats High Ranges" },
      "Karnataka": { center: [12.9716, 77.5946], zoom: 7, region: "Deccan Plateau & Western Ghats" },
      "Jammu & Kashmir": { center: [33.7782, 76.5762], zoom: 8, region: "Pir Panjal & Great Himalayas" },
      "Ladakh": { center: [34.1526, 77.5771], zoom: 7, region: "Trans-Himalayan Cold Desert" },
      "Assam": { center: [26.2006, 92.9376], zoom: 8, region: "Brahmaputra Valley" },
      "Arunachal Pradesh": { center: [28.2180, 94.7278], zoom: 8, region: "Eastern Himalayan Borderland" },
      "Nagaland": { center: [26.1584, 94.5624], zoom: 9, region: "Naga Hills" },
      "Manipur": { center: [24.6637, 93.9063], zoom: 9, region: "Manipur Hills" },
      "Mizoram": { center: [23.1645, 92.9376], zoom: 9, region: "Lushai Hills" },
      "Tripura": { center: [23.9408, 91.9882], zoom: 9, region: "Jampui Hills" },
      "West Bengal": { center: [26.7271, 88.3953], zoom: 7, region: "Darjeeling Sub-Himalayas & Delta" },
      "Maharashtra": { center: [19.7515, 75.7139], zoom: 7, region: "Sahyadri Ghats & Deccan" },
      "Tamil Nadu": { center: [11.1271, 78.6569], zoom: 7, region: "Nilgiri & Anaimalai Hills" },
      "Goa": { center: [15.2993, 74.1240], zoom: 10, region: "Konkan Coastal Escarpment" },
      "Gujarat": { center: [22.2587, 71.1924], zoom: 7, region: "Girnar & Western Plains" },
      "Bihar": { center: [25.0961, 85.3131], zoom: 8, region: "Indo-Gangetic Basin" },
      "Uttar Pradesh": { center: [26.8467, 80.9462], zoom: 7, region: "Northern Plains" },
      "Rajasthan": { center: [27.0238, 74.2179], zoom: 7, region: "Aravalli Range & Thar" },
      "Madhya Pradesh": { center: [22.9734, 78.6569], zoom: 7, region: "Satpura & Vindhya Range" },
      "Odisha": { center: [20.9517, 85.0985], zoom: 7, region: "Eastern Ghats Corridor" },
      "Punjab": { center: [31.1471, 75.3412], zoom: 8, region: "Shivalik Fringe Plains" },
      "Haryana": { center: [29.0588, 76.0856], zoom: 8, region: "Aravalli Northern Foothills" },
      "Telangana": { center: [18.1124, 79.0193], zoom: 7, region: "Deccan Tableland" },
      "Andhra Pradesh": { center: [15.9129, 79.7400], zoom: 7, region: "Eastern Ghats" },
      "Jharkhand": { center: [23.6102, 85.2799], zoom: 8, region: "Chota Nagpur Plateau" },
      "Chhattisgarh": { center: [21.2787, 81.8661], zoom: 7, region: "Maikal Hills & Bastar" },
      "Delhi NCR": { center: [28.6139, 77.2090], zoom: 11, region: "National Capital Territory" }
    }
  },
  "United States": {
    code: "US",
    center: [37.0902, -95.7129],
    zoom: 4,
    states: {
      "California": { center: [36.7783, -119.4179], zoom: 6, region: "Sierra Nevada & Coast Ranges" },
      "Washington": { center: [47.7511, -120.7401], zoom: 7, region: "Cascade Mountain Range" },
      "Oregon": { center: [43.8041, -120.5542], zoom: 7, region: "Cascade & Coast Ranges" },
      "Colorado": { center: [39.5501, -105.7821], zoom: 7, region: "Rocky Mountains" },
      "Hawaii": { center: [19.8968, -155.5828], zoom: 8, region: "Volcanic Island Slopes" },
      "Alaska": { center: [64.2008, -149.4937], zoom: 5, region: "Aleutian & Brooks Range" },
      "North Carolina": { center: [35.7596, -79.0193], zoom: 7, region: "Appalachian Blue Ridge" },
      "New York": { center: [40.7128, -74.0060], zoom: 8, region: "Adirondack & Catskill Slopes" }
    }
  },
  "Japan": {
    code: "JP",
    center: [36.2048, 138.2529],
    zoom: 6,
    states: {
      "Nagano": { center: [36.6513, 138.1810], zoom: 8, region: "Japanese Alps (Hida, Kiso, Akaishi)" },
      "Tokyo": { center: [35.6762, 139.6503], zoom: 10, region: "Kanto Plain & Tama Hills" },
      "Hokkaido": { center: [43.0642, 141.3469], zoom: 7, region: "Daisetsuzan Volcanic Range" },
      "Kyoto": { center: [35.0116, 135.7681], zoom: 9, region: "Tamba Highlands" },
      "Niigata": { center: [37.9026, 139.0232], zoom: 8, region: "Echigo Mountains" },
      "Shizuoka": { center: [34.9769, 138.3831], zoom: 8, region: "Mount Fuji Southern Slopes" },
      "Hiroshima": { center: [34.3853, 132.4553], zoom: 8, region: "Chugoku Granite Mountain Belt" }
    }
  },
  "Switzerland": {
    code: "CH",
    center: [46.8182, 8.2275],
    zoom: 8,
    states: {
      "Valais (Wallis)": { center: [46.1905, 7.5449], zoom: 9, region: "Pennine & Bernese Alps (Matterhorn)" },
      "Bern (Oberland)": { center: [46.6863, 7.8632], zoom: 9, region: "Jungfrau & Eiger Alpine Belt" },
      "Graubünden": { center: [46.6569, 9.5780], zoom: 9, region: "Rhaetian Alps & Engadin" },
      "Uri": { center: [46.7758, 8.6366], zoom: 9, region: "Gotthard Massif" },
      "Ticino": { center: [46.3317, 8.8005], zoom: 9, region: "Southern Alpine Slopes" },
      "Geneva": { center: [46.2044, 6.1432], zoom: 11, region: "Lake Geneva Basin" }
    }
  },
  "United Kingdom": {
    code: "UK",
    center: [55.3781, -3.4360],
    zoom: 6,
    states: {
      "Scotland Highlands": { center: [57.3229, -4.4244], zoom: 7, region: "Grampian Mountains & Great Glen" },
      "Wales (Cymru)": { center: [52.1307, -3.7837], zoom: 8, region: "Snowdonia & Brecon Beacons" },
      "England": { center: [52.3555, -1.1743], zoom: 7, region: "Lake District & Pennines" },
      "Northern Ireland": { center: [54.7877, -6.4923], zoom: 8, region: "Mourne Mountains" }
    }
  },
  "Nepal": {
    code: "NP",
    center: [28.3949, 84.1240],
    zoom: 7,
    states: {
      "Gandaki (Annapurna)": { center: [28.3949, 84.1240], zoom: 8, region: "Annapurna Massif & Pokhara" },
      "Bagmati (Kathmandu)": { center: [27.7172, 85.3240], zoom: 9, region: "Kathmandu Valley & Langtang" },
      "Koshi (Everest / Solu)": { center: [27.5000, 87.0000], zoom: 8, region: "Khumbu Himalayas & Mount Everest" },
      "Karnali": { center: [29.2788, 82.3111], zoom: 8, region: "Western High Himalayas" }
    }
  },
  "Italy": {
    code: "IT",
    center: [41.8719, 12.5674],
    zoom: 6,
    states: {
      "Campania (Amalfi)": { center: [40.6340, 14.6027], zoom: 9, region: "Amalfi Coast Limestone Escarpment" },
      "Trentino-Alto Adige": { center: [46.4983, 11.3548], zoom: 8, region: "Dolomite Alps" },
      "Liguria (Cinque Terre)": { center: [44.1070, 9.7289], zoom: 9, region: "Ligurian Coastal Slopes" },
      "Sicily": { center: [37.5990, 14.0154], zoom: 8, region: "Mount Etna Volcanic Flanks" }
    }
  },
  "Brazil": {
    code: "BR",
    center: [-14.2350, -51.9253],
    zoom: 4,
    states: {
      "Rio de Janeiro (Serra)": { center: [-22.4500, -43.1000], zoom: 9, region: "Serra dos Órgãos / Petrópolis" },
      "São Paulo": { center: [-23.5505, -46.6333], zoom: 8, region: "Serra do Mar Coastal Escarpment" },
      "Minas Gerais": { center: [-19.9167, -43.9345], zoom: 7, region: "Espinhaço Range Mining Slopes" },
      "Santa Catarina": { center: [-27.2423, -50.2189], zoom: 8, region: "Vale do Itajaí" }
    }
  },
  "Australia": {
    code: "AU",
    center: [-25.2744, 133.7751],
    zoom: 4,
    states: {
      "New South Wales": { center: [-33.7150, 150.3114], zoom: 8, region: "Blue Mountains & Great Dividing Range" },
      "Victoria": { center: [-37.4713, 144.7852], zoom: 7, region: "Victorian Alps & Otway Ranges" },
      "Queensland": { center: [-20.9176, 142.7028], zoom: 6, region: "Great Dividing Escarpment" }
    }
  },
  "Canada": {
    code: "CA",
    center: [56.1304, -106.3468],
    zoom: 4,
    states: {
      "British Columbia": { center: [53.7267, -127.6476], zoom: 6, region: "Coast Mountains & Canadian Rockies" },
      "Alberta": { center: [53.9333, -116.5765], zoom: 6, region: "Canadian Rocky Mountain Front" },
      "Quebec": { center: [52.9399, -73.5491], zoom: 5, region: "Laurentian Highlands" }
    }
  }
};
