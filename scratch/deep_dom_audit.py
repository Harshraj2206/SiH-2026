import subprocess
import time
import json
import urllib.request
import asyncio
import websockets
import os

ARTIFACTS_DIR = r"C:\Users\Pro 5\.gemini\antigravity-ide\brain\73f7557b-6586-4695-ab80-f77e8b8d6a64"
USER_DATA_DIR = r"d:\Visual Studio Code\Demo2\.chrome_dom_audit"

async def deep_dom_audit():
    chrome_cmd = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        "--headless=new",
        "--remote-debugging-port=9238",
        "--window-size=1440,900",
        f"--user-data-dir={USER_DATA_DIR}",
        "http://127.0.0.1:5177/overview"
    ]
    proc = subprocess.Popen(chrome_cmd)
    try:
        await asyncio.sleep(3)
        with urllib.request.urlopen("http://127.0.0.1:9238/json/list") as resp:
            tabs = json.loads(resp.read().decode("utf-8"))
            page_tab = next((t for t in tabs if "overview" in t.get("url", "") or "5177" in t.get("url", "")), tabs[0])
            ws_url = page_tab["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url) as ws:
            msg_id = 1

            async def send(method, params=None):
                nonlocal msg_id
                cmd = {"id": msg_id, "method": method, "params": params or {}}
                msg_id += 1
                await ws.send(json.dumps(cmd))
                while True:
                    res = json.loads(await ws.recv())
                    if res.get("id") == cmd["id"]:
                        return res

            async def eval_js(expression):
                res = await send("Runtime.evaluate", {"expression": expression, "returnByValue": True})
                return res.get("result", {}).get("result", {}).get("value")

            await send("Page.enable")
            await send("DOM.enable")
            await asyncio.sleep(2)

            audit_js = """
            (() => {
                const results = {
                    bodyStyle: {
                        bg: window.getComputedStyle(document.body).backgroundColor,
                        opacity: window.getComputedStyle(document.body).opacity,
                        filter: window.getComputedStyle(document.body).filter
                    },
                    dimmingElements: [],
                    parentElementsWithFilterOrOpacity: []
                };

                // Check all elements in DOM
                const all = document.querySelectorAll('*');
                all.forEach(el => {
                    const s = window.getComputedStyle(el);
                    const rect = el.getBoundingClientRect();

                    // Check if element is full screen or large overlay
                    if (rect.width >= window.innerWidth * 0.5 && rect.height >= window.innerHeight * 0.5) {
                        const hasDarkBg = s.backgroundColor.includes('rgba(0, 0, 0') || s.backgroundColor === 'rgb(0, 0, 0)';
                        const hasFilter = s.filter !== 'none' || s.backdropFilter !== 'none';
                        const hasLowOpacity = parseFloat(s.opacity) < 1;
                        const isPositioned = s.position === 'fixed' || s.position === 'absolute';

                        if ((hasDarkBg || hasFilter || hasLowOpacity) && isPositioned && s.display !== 'none' && s.visibility !== 'hidden') {
                            results.dimmingElements.push({
                                tag: el.tagName,
                                id: el.id,
                                className: el.className,
                                position: s.position,
                                zIndex: s.zIndex,
                                bg: s.backgroundColor,
                                opacity: s.opacity,
                                filter: s.filter,
                                backdropFilter: s.backdropFilter,
                                pointerEvents: s.pointerEvents,
                                rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
                            });
                        }
                    }

                    // Check if any ancestor of main has opacity or filter
                    if (el.contains(document.querySelector('main')) && el !== document.documentElement && el !== document.body) {
                        if (s.filter !== 'none' || parseFloat(s.opacity) < 1 || s.mixBlendMode !== 'normal') {
                            results.parentElementsWithFilterOrOpacity.push({
                                tag: el.tagName,
                                className: el.className,
                                opacity: s.opacity,
                                filter: s.filter,
                                mixBlendMode: s.mixBlendMode
                            });
                        }
                    }
                });

                return results;
            })()
            """
            data = await eval_js(audit_js)
            print("DEEP DOM AUDIT RESULT:")
            print(json.dumps(data, indent=2))

    finally:
        proc.terminate()
        try:
            import shutil
            shutil.rmtree(USER_DATA_DIR, ignore_errors=True)
        except Exception:
            pass

asyncio.run(deep_dom_audit())
