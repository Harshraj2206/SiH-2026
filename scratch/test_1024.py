import subprocess, time, json, urllib.request, asyncio, websockets

async def test_1024():
    chrome_cmd = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        "--headless=new",
        "--remote-debugging-port=9240",
        "--window-size=1024,768",
        r"--user-data-dir=d:\Visual Studio Code\Demo2\.chrome_1024_test",
        "http://127.0.0.1:5177/overview"
    ]
    proc = subprocess.Popen(chrome_cmd)
    try:
        await asyncio.sleep(3)
        with urllib.request.urlopen("http://127.0.0.1:9240/json/list") as resp:
            tabs = json.loads(resp.read().decode("utf-8"))
            page_tab = next((t for t in tabs if "overview" in t.get("url", "") or "5177" in t.get("url", "")), tabs[0])
            ws_url = page_tab["webSocketDebuggerUrl"]
        async with websockets.connect(ws_url) as ws:
            js = """
            (() => {
                return {
                    innerWidth: window.innerWidth,
                    innerHeight: window.innerHeight,
                    matchesLg: window.matchMedia('(min-width: 1024px)').matches,
                    matchesMd: window.matchMedia('(min-width: 768px)').matches,
                    sidebarVisible: window.getComputedStyle(document.querySelector('aside')).transform,
                    headerHamburgerDisplay: window.getComputedStyle(document.querySelector('button[aria-label="Toggle Navigation"]')).display
                };
            })()
            """
            await ws.send(json.dumps({"id": 1, "method": "Runtime.evaluate", "params": {"expression": js, "returnByValue": True}}))
            while True:
                res = json.loads(await ws.recv())
                if res.get("id") == 1:
                    print("Result at 1024x768 window size:")
                    print(json.dumps(res.get("result", {}).get("result", {}).get("value"), indent=2))
                    break
    finally:
        proc.terminate()

asyncio.run(test_1024())
