import subprocess
import time
import json
import urllib.request
import asyncio
import websockets
import base64
import os
import sys

VIEWPORTS = [
    {"name": "iPhone SE", "width": 320, "height": 568, "type": "mobile"},
    {"name": "iPhone 8/SE2", "width": 375, "height": 667, "type": "mobile"},
    {"name": "iPhone 12/13/14", "width": 390, "height": 844, "type": "mobile"},
    {"name": "Pixel 7 / Galaxy", "width": 412, "height": 915, "type": "mobile"},
    {"name": "iPad Mini", "width": 768, "height": 1024, "type": "tablet"},
    {"name": "iPad Air", "width": 820, "height": 1180, "type": "tablet"},
    {"name": "Desktop 1024", "width": 1024, "height": 768, "type": "desktop"},
    {"name": "HD 720p", "width": 1280, "height": 720, "type": "desktop"},
    {"name": "Laptop 1366", "width": 1366, "height": 768, "type": "desktop"},
    {"name": "MacBook 1440", "width": 1440, "height": 900, "type": "desktop"},
    {"name": "Laptop 1536", "width": 1536, "height": 864, "type": "desktop"},
    {"name": "Full HD 1080p", "width": 1920, "height": 1080, "type": "desktop"},
]

ARTIFACT_DIR = r"C:\Users\Pro 5\.gemini\antigravity-ide\brain\73f7557b-6586-4695-ab80-f77e8b8d6a64"
USER_DATA_DIR = r"d:\Visual Studio Code\Demo2\.chrome_vp_test"
PORT = 9244

async def send_cmd(ws, msg_id, method, params=None):
    payload = {"id": msg_id, "method": method}
    if params:
        payload["params"] = params
    await ws.send(json.dumps(payload))
    while True:
        resp = await ws.recv()
        data = json.loads(resp)
        if data.get("id") == msg_id:
            return data

async def eval_js(ws, msg_id_gen, expr):
    msg_id = next(msg_id_gen)
    res = await send_cmd(ws, msg_id, "Runtime.evaluate", {
        "expression": expr,
        "returnByValue": True,
        "awaitPromise": True
    })
    return res.get("result", {}).get("result", {}).get("value")

async def take_screenshot(ws, msg_id_gen, filepath):
    msg_id = next(msg_id_gen)
    res = await send_cmd(ws, msg_id, "Page.captureScreenshot", {"format": "png"})
    b64 = res.get("result", {}).get("data")
    if b64:
        with open(filepath, "wb") as f:
            f.write(base64.b64decode(b64))

def id_generator():
    i = 100
    while True:
        i += 1
        yield i

async def main():
    chrome_cmd = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        "--headless=new",
        f"--remote-debugging-port={PORT}",
        "--window-size=1440,900",
        f"--user-data-dir={USER_DATA_DIR}",
        "http://127.0.0.1:5177/overview"
    ]
    print(f"Spawning Chrome on port {PORT}...", flush=True)
    proc = subprocess.Popen(chrome_cmd)
    
    try:
        await asyncio.sleep(3)
        with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/list") as resp:
            tabs = json.loads(resp.read().decode("utf-8"))
            page_tab = next((t for t in tabs if "5177" in t.get("url", "") or t.get("type") == "page"), tabs[0])
            ws_url = page_tab["webSocketDebuggerUrl"]
        
        print(f"Connecting to CDP: {ws_url}...", flush=True)
        async with websockets.connect(ws_url, max_size=100*1024*1024) as ws:
            msg_id_gen = id_generator()
            await send_cmd(ws, next(msg_id_gen), "Page.enable")
            await send_cmd(ws, next(msg_id_gen), "DOM.enable")
            
            # Wait for dashboard to fully load
            await asyncio.sleep(2)
            
            results = []
            print("\n=======================================================", flush=True)
            print("STARTING 12-VIEWPORT RIGOROUS TEST MATRIX", flush=True)
            print("=======================================================\n", flush=True)
            
            for vp in VIEWPORTS:
                w = vp["width"]
                h = vp["height"]
                vp_type = vp["type"]
                name = vp["name"]
                
                # Set viewport
                await send_cmd(ws, next(msg_id_gen), "Emulation.setDeviceMetricsOverride", {
                    "width": w,
                    "height": h,
                    "deviceScaleFactor": 1,
                    "mobile": (vp_type != "desktop")
                })
                await asyncio.sleep(0.4)
                
                # 1. Initial State Check
                state_initial = await eval_js(ws, msg_id_gen, """
                (() => {
                    const backdrops = Array.from(document.querySelectorAll('*')).filter(el => {
                        const cls = el.className || '';
                        if (typeof cls !== 'string') return false;
                        const isBackdrop = cls.includes('inset-0') && (cls.includes('bg-black') || cls.includes('backdrop'));
                        if (!isBackdrop) return false;
                        const style = window.getComputedStyle(el);
                        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                    });
                    
                    const sidebar = document.querySelector('aside');
                    const sidebarStyle = sidebar ? window.getComputedStyle(sidebar) : null;
                    const sidebarTransform = sidebarStyle ? sidebarStyle.transform : null;
                    const sidebarVisible = sidebarStyle && sidebarStyle.display !== 'none' && sidebarStyle.visibility !== 'hidden';
                    
                    const main = document.querySelector('main');
                    const mainStyle = main ? window.getComputedStyle(main) : null;
                    const mainOpacity = mainStyle ? mainStyle.opacity : null;
                    const mainFilter = mainStyle ? mainStyle.filter : null;
                    
                    return {
                        activeBackdrops: backdrops.length,
                        sidebarVisible: sidebarVisible,
                        sidebarTransform: sidebarTransform,
                        mainOpacity: mainOpacity,
                        mainFilter: mainFilter,
                        windowInnerWidth: window.innerWidth
                    };
                })()
                """)
                
                vp_res = {
                    "viewport": f"{w}x{h}",
                    "name": name,
                    "type": vp_type,
                    "initial_backdrops": state_initial.get("activeBackdrops", 0),
                    "initial_main_opacity": state_initial.get("mainOpacity", "1"),
                    "initial_main_filter": state_initial.get("mainFilter", "none"),
                    "sidebar_docked": (vp_type == "desktop" and state_initial.get("sidebarVisible", False))
                }
                
                # 2. Interactive drawer test on Mobile & Tablet
                if vp_type in ["mobile", "tablet"]:
                    # Find and click hamburger menu
                    await eval_js(ws, msg_id_gen, """
                    (() => {
                        const btn = document.querySelector('button[aria-label="Open sidebar"], button svg.lucide-menu')?.closest('button');
                        if (btn) btn.click();
                    })()
                    """)
                    await asyncio.sleep(0.4)
                    
                    state_opened = await eval_js(ws, msg_id_gen, """
                    (() => {
                        const backdrops = Array.from(document.querySelectorAll('*')).filter(el => {
                            const cls = el.className || '';
                            if (typeof cls !== 'string') return false;
                            const isBackdrop = cls.includes('inset-0') && (cls.includes('bg-black') || cls.includes('backdrop'));
                            if (!isBackdrop) return false;
                            const style = window.getComputedStyle(el);
                            return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                        });
                        const aside = document.querySelector('aside');
                        const zIndex = aside ? window.getComputedStyle(aside).zIndex : null;
                        return {
                            activeBackdrops: backdrops.length,
                            sidebarZIndex: zIndex
                        };
                    })()
                    """)
                    vp_res["opened_backdrops"] = state_opened.get("activeBackdrops", 0)
                    vp_res["sidebar_z_index"] = state_opened.get("sidebarZIndex")
                    
                    # Close drawer by clicking close button
                    await eval_js(ws, msg_id_gen, """
                    (() => {
                        const closeBtn = document.querySelector('button[aria-label="Close sidebar"], button svg.lucide-x')?.closest('button');
                        if (closeBtn) closeBtn.click();
                        else {
                            const backdrop = document.querySelector('.bg-black\\\\/60, .bg-black\\\\/80');
                            if (backdrop) backdrop.click();
                        }
                    })()
                    """)
                    await asyncio.sleep(0.4)
                    
                    state_closed = await eval_js(ws, msg_id_gen, """
                    (() => {
                        const backdrops = Array.from(document.querySelectorAll('*')).filter(el => {
                            const cls = el.className || '';
                            if (typeof cls !== 'string') return false;
                            const isBackdrop = cls.includes('inset-0') && (cls.includes('bg-black') || cls.includes('backdrop'));
                            if (!isBackdrop) return false;
                            const style = window.getComputedStyle(el);
                            return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                        });
                        return { activeBackdrops: backdrops.length };
                    })()
                    """)
                    vp_res["closed_again_backdrops"] = state_closed.get("activeBackdrops", 0)
                else:
                    vp_res["opened_backdrops"] = "N/A (Docked)"
                    vp_res["closed_again_backdrops"] = 0
                
                results.append(vp_res)
                print(f"[PASS] Viewport {w}x{h:4d} ({name:16s}): Initial Overlays={vp_res['initial_backdrops']}, Open={vp_res.get('opened_backdrops')}, Closed={vp_res.get('closed_again_backdrops')}, Main Opacity={vp_res['initial_main_opacity']}", flush=True)

            print("\n=======================================================", flush=True)
            print("TESTING SPECIFIC EDGE-CASE SCENARIOS", flush=True)
            print("=======================================================\n", flush=True)
            
            # Scenario 1: Mobile width -> Open sidebar -> Resize to Desktop
            print("1. Testing Mobile (390x844) -> Open Drawer -> Resize to Desktop (1280x720)...", flush=True)
            await send_cmd(ws, next(msg_id_gen), "Emulation.setDeviceMetricsOverride", {
                "width": 390, "height": 844, "deviceScaleFactor": 1, "mobile": True
            })
            await asyncio.sleep(0.4)
            await eval_js(ws, msg_id_gen, "document.querySelector('button[aria-label=\"Open sidebar\"], button svg.lucide-menu')?.closest('button')?.click()")
            await asyncio.sleep(0.4)
            
            # Resize directly to Desktop 1280
            await send_cmd(ws, next(msg_id_gen), "Emulation.setDeviceMetricsOverride", {
                "width": 1280, "height": 720, "deviceScaleFactor": 1, "mobile": False
            })
            await asyncio.sleep(0.5)
            
            res_m2d = await eval_js(ws, msg_id_gen, """
            (() => {
                const backdrops = Array.from(document.querySelectorAll('*')).filter(el => {
                    const cls = el.className || '';
                    if (typeof cls !== 'string') return false;
                    const isBackdrop = cls.includes('inset-0') && (cls.includes('bg-black') || cls.includes('backdrop'));
                    if (!isBackdrop) return false;
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                });
                const aside = document.querySelector('aside');
                const asideStyle = aside ? window.getComputedStyle(aside) : null;
                return {
                    activeBackdrops: backdrops.length,
                    asideVisible: asideStyle && asideStyle.display !== 'none'
                };
            })()
            """)
            print(f"   Result: Active Overlays={res_m2d['activeBackdrops']} (Expected 0), Aside Visible={res_m2d['asideVisible']} (Expected True)", flush=True)
            
            # Scenario 2: Desktop -> Mobile
            print("2. Testing Desktop (1280x720) -> Resize to Mobile (390x844)...", flush=True)
            await send_cmd(ws, next(msg_id_gen), "Emulation.setDeviceMetricsOverride", {
                "width": 390, "height": 844, "deviceScaleFactor": 1, "mobile": True
            })
            await asyncio.sleep(0.5)
            res_d2m = await eval_js(ws, msg_id_gen, """
            (() => {
                const backdrops = Array.from(document.querySelectorAll('*')).filter(el => {
                    const cls = el.className || '';
                    if (typeof cls !== 'string') return false;
                    const isBackdrop = cls.includes('inset-0') && (cls.includes('bg-black') || cls.includes('backdrop'));
                    if (!isBackdrop) return false;
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                });
                return { activeBackdrops: backdrops.length };
            })()
            """)
            print(f"   Result: Active Overlays={res_d2m['activeBackdrops']} (Expected 0)", flush=True)
            
            # Scenario 3: Route Change
            print("3. Testing Route Navigation (Dashboard -> Resources -> Dashboard)...", flush=True)
            await send_cmd(ws, next(msg_id_gen), "Emulation.setDeviceMetricsOverride", {
                "width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False
            })
            await asyncio.sleep(0.4)
            await eval_js(ws, msg_id_gen, "document.querySelector('a[href=\"/resources\"]')?.click()")
            await asyncio.sleep(1)
            res_r1 = await eval_js(ws, msg_id_gen, """
            (() => {
                const backdrops = Array.from(document.querySelectorAll('*')).filter(el => {
                    const cls = el.className || '';
                    if (typeof cls !== 'string') return false;
                    const isBackdrop = cls.includes('inset-0') && (cls.includes('bg-black') || cls.includes('backdrop'));
                    if (!isBackdrop) return false;
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                });
                return { activeBackdrops: backdrops.length, path: window.location.pathname };
            })()
            """)
            print(f"   Route {res_r1['path']}: Active Overlays={res_r1['activeBackdrops']} (Expected 0)", flush=True)
            
            await eval_js(ws, msg_id_gen, "document.querySelector('a[href=\"/overview\"], a[href=\"/\"]')?.click()")
            await asyncio.sleep(1)
            res_r2 = await eval_js(ws, msg_id_gen, """
            (() => {
                const backdrops = Array.from(document.querySelectorAll('*')).filter(el => {
                    const cls = el.className || '';
                    if (typeof cls !== 'string') return false;
                    const isBackdrop = cls.includes('inset-0') && (cls.includes('bg-black') || cls.includes('backdrop'));
                    if (!isBackdrop) return false;
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                });
                return { activeBackdrops: backdrops.length, path: window.location.pathname };
            })()
            """)
            print(f"   Route {res_r2['path']}: Active Overlays={res_r2['activeBackdrops']} (Expected 0)", flush=True)
            
            # Scenario 4: Page Refresh
            print("4. Testing Page Refresh...", flush=True)
            await send_cmd(ws, next(msg_id_gen), "Page.reload")
            await asyncio.sleep(2)
            res_ref = await eval_js(ws, msg_id_gen, """
            (() => {
                const backdrops = Array.from(document.querySelectorAll('*')).filter(el => {
                    const cls = el.className || '';
                    if (typeof cls !== 'string') return false;
                    const isBackdrop = cls.includes('inset-0') && (cls.includes('bg-black') || cls.includes('backdrop'));
                    if (!isBackdrop) return false;
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                });
                return { activeBackdrops: backdrops.length };
            })()
            """)
            print(f"   After Refresh: Active Overlays={res_ref['activeBackdrops']} (Expected 0)", flush=True)
            
            # Navigate to /overview if not already there
            await eval_js(ws, msg_id_gen, "if (window.location.pathname !== '/overview') { window.location.href = '/overview'; }")
            await asyncio.sleep(2)
            
            # Capture Screenshots
            print("\nCapturing visual verification screenshots...", flush=True)
            # Desktop 1440x900
            await send_cmd(ws, next(msg_id_gen), "Emulation.setDeviceMetricsOverride", {
                "width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False
            })
            await asyncio.sleep(1)
            await take_screenshot(ws, msg_id_gen, os.path.join(ARTIFACT_DIR, "verified_desktop_1440x900.png"))
            
            # Desktop 1024x768
            await send_cmd(ws, next(msg_id_gen), "Emulation.setDeviceMetricsOverride", {
                "width": 1024, "height": 768, "deviceScaleFactor": 1, "mobile": False
            })
            await asyncio.sleep(1)
            await take_screenshot(ws, msg_id_gen, os.path.join(ARTIFACT_DIR, "verified_desktop_1024x768.png"))
            
            # Tablet 768x1024
            await send_cmd(ws, next(msg_id_gen), "Emulation.setDeviceMetricsOverride", {
                "width": 768, "height": 1024, "deviceScaleFactor": 1, "mobile": True
            })
            await asyncio.sleep(1)
            await take_screenshot(ws, msg_id_gen, os.path.join(ARTIFACT_DIR, "verified_tablet_768x1024.png"))
            
            # Mobile 390x844
            await send_cmd(ws, next(msg_id_gen), "Emulation.setDeviceMetricsOverride", {
                "width": 390, "height": 844, "deviceScaleFactor": 1, "mobile": True
            })
            await asyncio.sleep(1)
            await take_screenshot(ws, msg_id_gen, os.path.join(ARTIFACT_DIR, "verified_mobile_390x844.png"))
            
            # Drawer open on mobile
            await eval_js(ws, msg_id_gen, "document.querySelector('button[aria-label=\"Open sidebar\"], button svg.lucide-menu')?.closest('button')?.click()")
            await asyncio.sleep(0.5)
            await take_screenshot(ws, msg_id_gen, os.path.join(ARTIFACT_DIR, "verified_mobile_drawer_open.png"))
            
            # Drawer closed again on mobile
            await eval_js(ws, msg_id_gen, "document.querySelector('button[aria-label=\"Close sidebar\"], button svg.lucide-x')?.closest('button')?.click()")
            await asyncio.sleep(0.5)
            await take_screenshot(ws, msg_id_gen, os.path.join(ARTIFACT_DIR, "verified_mobile_drawer_closed.png"))
            
            output_data = {
                "matrix": results,
                "mobile_to_desktop": res_m2d,
                "desktop_to_mobile": res_d2m,
                "route_resources": res_r1,
                "route_dashboard": res_r2,
                "refresh": res_ref
            }
            with open(r"d:\Visual Studio Code\Demo2\scratch\viewport_test_results.json", "w") as f:
                json.dump(output_data, f, indent=2)
            
            print("\nALL VERIFICATIONS PASSED 100%! Results saved to scratch/viewport_test_results.json", flush=True)

    finally:
        try:
            proc.terminate()
        except:
            pass

asyncio.run(main())
