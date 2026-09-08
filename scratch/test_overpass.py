import urllib.request
import urllib.parse
import json

q = """[out:json][timeout:15];
(
  node["amenity"="hospital"](around:20000, 12.6445, 77.4365);
  node["amenity"="clinic"](around:20000, 12.6445, 77.4365);
  way["amenity"="hospital"](around:20000, 12.6445, 77.4365);
);
out center 15;"""

url = "https://overpass-api.de/api/interpreter"
req = urllib.request.Request(url, data=urllib.parse.urlencode({'data': q}).encode('utf-8'), headers={'User-Agent': 'LandSafe-Places/2.0'})
try:
    with urllib.request.urlopen(req, timeout=12) as resp:
        d = json.loads(resp.read().decode('utf-8'))
        print("Success! Elements found:", len(d.get("elements", [])))
        for el in d.get("elements", []):
            tags = el.get("tags", {})
            name = tags.get("name") or tags.get("name:en")
            if name:
                lat = el.get("lat") or el.get("center", {}).get("lat")
                lon = el.get("lon") or el.get("center", {}).get("lon")
                print(f" - {name} ({lat}, {lon}) | {tags.get('amenity')} | Phone: {tags.get('phone') or tags.get('contact:phone')}")
except Exception as e:
    print("Overpass query error:", e)
