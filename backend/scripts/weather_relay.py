"""
Fetch Open-Meteo for every monitored zone and push the raw responses to the backend.
Run by .github/workflows/weather-relay.yml (Render's shared IP is rate-limited by Open-Meteo).
Env: BACKEND_URL, WEATHER_RELAY_TOKEN.
"""

import json
import os
import sys
import time
import urllib.request
from urllib.parse import urlparse

BACKEND = os.environ["BACKEND_URL"].rstrip("/")
TOKEN = os.environ["WEATHER_RELAY_TOKEN"]


def http(url, data=None, headers=None, timeout=30):
    req = urllib.request.Request(url, data=data, headers={"User-Agent": "LandSafe-WeatherRelay/1.0", **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get_targets():
    # The free Render instance may be asleep; give it time to wake up.
    for attempt in range(4):
        try:
            return http(f"{BACKEND}/api/weather/relay-targets", timeout=90)["targets"]
        except Exception as e:
            print(f"Waiting for backend ({e})")
            time.sleep(20)
    sys.exit("Backend did not respond")


def main():
    items = []
    for t in get_targets():
        if urlparse(t["url"]).hostname != "api.open-meteo.com":
            print(f"Skipping unexpected URL {t['url']}")
            continue
        try:
            items.append({"latitude": t["latitude"], "longitude": t["longitude"], "payload": http(t["url"])})
        except Exception as e:
            print(f"Open-Meteo failed for {t['latitude']},{t['longitude']}: {e}")
        time.sleep(0.5)

    if not items:
        sys.exit("No weather fetched")
    result = http(f"{BACKEND}/api/weather/relay", data=json.dumps({"items": items}).encode(),
                  headers={"Content-Type": "application/json", "X-Relay-Token": TOKEN}, timeout=60)
    print(f"Accepted {result['accepted']} of {len(items)}; rejected: {result['rejected']}")
    if not result["accepted"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
