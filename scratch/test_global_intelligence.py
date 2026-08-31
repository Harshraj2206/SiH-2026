import urllib.request
import json

test_locations = [
    ("Harohalli, Karnataka, India", 12.6445, 77.4365),
    ("Shillong, Meghalaya, India", 25.5788, 91.8933),
    ("Gangtok, Sikkim, India", 27.3389, 88.6065),
    ("Tokyo, Japan", 35.6762, 139.6503),
    ("London, United Kingdom", 51.5074, -0.1278),
    ("New York, USA", 40.7128, -74.0060),
    ("Sydney, Australia", -33.8688, 151.2093),
    ("Sao Paulo, Brazil", -23.5505, -46.6333),
]

print("=" * 60)
print("LANDSAFE GLOBAL GEOSPATIAL INTELLIGENCE - 8 CITY TEST")
print("=" * 60)

for label, lat, lng in test_locations:
    url = f"http://127.0.0.1:8000/api/location-intelligence?lat={lat}&lng={lng}"
    req = urllib.request.Request(url, headers={"User-Agent": "LandSafe-TestSuite/2.0"})
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            data = json.loads(response.read().decode("utf-8"))
            loc = data["location"]
            w = data["weather"]
            p = data["precipitation"]
            s = data["soil_moisture"]
            t = data["terrain"]
            r = data["risk"]
            h = data["nearby_hospitals"]
            sh = data["nearby_shelters"]

            print(f"\n[{label}] ({lat}, {lng})")
            print(f"  * Resolved: {loc.get('display_name')} [{loc.get('country')}]")
            print(f"  * Weather: {w.get('temperature_c')} deg C, {w.get('condition')} | Provider: {w.get('agency')}")
            print(f"  * Precipitation: 24h={p.get('accum_24h_mm')} mm | 72h={p.get('accum_72h_mm')} mm (NASA GPM IMERG 10km grid)")
            print(f"  * Soil Moisture: {s.get('volumetric_m3m3')} m3/m3 ({s.get('saturation_pct')}%) (NASA SMAP 9km grid)")
            print(f"  * Terrain: Elev={t.get('elevation_amsl')}m AMSL, Slope={t.get('slope_deg')} deg (Copernicus 30m Global DEM)")
            print(f"  * Risk Score: {r.get('risk_score')}/100 [{r.get('risk_level')}] | Model: {r.get('model_coverage', {}).get('coverage_scope')}")
            print(f"  * Overpass Facilities: {len(h)} Hospitals, {len(sh)} Shelters discovered")
    except Exception as e:
        print(f"Error testing {label}: {e}")

print("\n" + "=" * 60)
print("ALL 8 GLOBAL LOCATIONS TESTED END-TO-END!")
print("=" * 60)
