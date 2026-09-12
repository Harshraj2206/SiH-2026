// Comprehensive Browser QA Test Suite for LandSafe
const { spawn } = require('child_process');
const http = require('http');

const BASE_URL = 'http://127.0.0.1:5177';
const CDP_PORT = 9555;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

let chromeProc = null;
let ws = null;
let msgId = 1;
const consoleErrors = [];
const consoleWarnings = [];
const networkFailures = [];
const pageResults = [];

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    const timer = setTimeout(() => {
      ws.removeEventListener('message', handler);
      reject(new Error(`Timeout waiting for response to ${method}`));
    }, 15000);

    const handler = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.id === id) {
        clearTimeout(timer);
        ws.removeEventListener('message', handler);
        if (data.error) {
          reject(new Error(data.error.message || JSON.stringify(data.error)));
        } else {
          resolve(data.result);
        }
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evalJs(expr) {
  const res = await send('Runtime.evaluate', {
    expression: expr,
    returnByValue: true,
    awaitPromise: true
  });
  if (res.exceptionDetails) {
    throw new Error(res.exceptionDetails.text || res.exceptionDetails.exception?.description || 'Eval error');
  }
  return res.result?.value;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function navigate(path) {
  console.log(`\n>>> Navigating to: ${BASE_URL}${path}`);
  await send('Page.navigate', { url: `${BASE_URL}${path}` });
  await sleep(1800);
}

async function runSuite() {
  console.log('==================================================');
  console.log('STARTING LANDSAFE FULL-STACK BROWSER QA SUITE');
  console.log('==================================================');

  // Spawn Chrome
  chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--window-size=1440,900',
    '--user-data-dir=C:\\Users\\Pro 5\\AppData\\Local\\Temp\\chrome_qa_suite',
    `${BASE_URL}/overview`
  ]);

  await sleep(2500);

  // Connect CDP
  const listRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
  const pages = await listRes.json();
  const target = pages.find(p => p.url.includes('5177')) || pages[0];
  console.log(`Connected to Target Page: ${target.title || target.url}`);

  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  // Enable CDP Domains
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');

  // Listen for console and network errors
  ws.addEventListener('message', (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        const type = msg.params.type;
        const text = (msg.params.args || []).map(a => a.value || a.description || '').join(' ');
        if (type === 'error') {
          consoleErrors.push(text);
          console.log(`   [BROWSER CONSOLE ERROR] ${text.slice(0, 150)}`);
        } else if (type === 'warning') {
          consoleWarnings.push(text);
        }
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const desc = msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text;
        consoleErrors.push(desc);
        console.log(`   [BROWSER UNCAUGHT EXCEPTION] ${desc.slice(0, 150)}`);
      }
      if (msg.method === 'Network.responseReceived') {
        const status = msg.params.response.status;
        const url = msg.params.response.url;
        if (status >= 400 && !url.includes('/api/auth/me')) {
          networkFailures.push({ url, status });
          console.log(`   [NETWORK ERROR] HTTP ${status} -> ${url}`);
        }
      }
    } catch (_) {}
  });

  // ============================================================
  // TEST 1: OVERVIEW PAGE
  // ============================================================
  console.log('\n--- [TEST 1] OVERVIEW PAGE ---');
  await navigate('/overview');
  
  // Dismiss location permission modal if present
  const modalDismissed = await evalJs(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent.includes('Default') || b.textContent.includes('Allow') || b.textContent.includes('Dismiss') || b.textContent.includes('Got it')
      );
      if (btn) { btn.click(); return true; }
      return false;
    })()
  `);
  console.log('Location Modal Dismissed:', modalDismissed);
  await sleep(1000);

  const overviewState = await evalJs(`
    (() => {
      const bodyText = document.body.innerText;
      const hasWeather = bodyText.includes('Precipitation') || bodyText.includes('Weather') || bodyText.includes('Rainfall');
      const hasRisk = bodyText.includes('Risk') || bodyText.includes('SCORE') || bodyText.includes('MODERATE') || bodyText.includes('HIGH') || bodyText.includes('LOW');
      const hasCorridors = bodyText.includes('Corridor') || bodyText.includes('Monitored') || bodyText.includes('National Highway');
      const statusBar = document.querySelector('.bottom-status-bar, [data-testid="bottom-status-bar"], footer, .fixed.bottom-0');
      
      return {
        hasWeather,
        hasRisk,
        hasCorridors,
        hasStatusBar: !!statusBar,
        title: document.title
      };
    })()
  `);
  console.log('Overview Inspection Results:', overviewState);
  pageResults.push({ page: '/overview', status: overviewState.hasWeather && overviewState.hasRisk ? 'PASS' : 'FAIL', details: overviewState });

  // ============================================================
  // TEST 2: SAFE ROUTE PAGE & MANUAL LOCATION SEARCH
  // ============================================================
  console.log('\n--- [TEST 2] SAFE ROUTE PAGE & MANUAL SEARCH ---');
  await navigate('/safe-route');
  await sleep(1000);

  const safeRouteTest = await evalJs(`
    (async () => {
      // Find origin and destination inputs
      const inputs = Array.from(document.querySelectorAll('input'));
      const originInput = inputs.find(i => 
        i.placeholder?.toLowerCase().includes('origin') || 
        i.placeholder?.toLowerCase().includes('start') ||
        i.getAttribute('name')?.toLowerCase().includes('origin')
      ) || inputs[0];

      const destInput = inputs.find(i => 
        i.placeholder?.toLowerCase().includes('destination') || 
        i.placeholder?.toLowerCase().includes('end') ||
        i.getAttribute('name')?.toLowerCase().includes('dest')
      ) || inputs[1];

      if (!originInput || !destInput) {
        return { success: false, error: 'Origin or Destination input not found' };
      }

      // 1. Set Origin to Bengaluru
      originInput.focus();
      originInput.value = 'Bengaluru';
      originInput.dispatchEvent(new Event('input', { bubbles: true }));
      originInput.dispatchEvent(new Event('change', { bubbles: true }));

      // 2. Set Destination to Mysuru
      destInput.focus();
      destInput.value = 'Mysuru';
      destInput.dispatchEvent(new Event('input', { bubbles: true }));
      destInput.dispatchEvent(new Event('change', { bubbles: true }));

      // 3. Find and test Swap button
      const buttons = Array.from(document.querySelectorAll('button'));
      const swapBtn = buttons.find(b => 
        b.getAttribute('title')?.toLowerCase().includes('swap') || 
        b.getAttribute('aria-label')?.toLowerCase().includes('swap') ||
        b.innerHTML.includes('lucide-arrow') ||
        b.innerHTML.includes('lucide-refresh') ||
        b.className.includes('swap')
      );

      let swapWorked = false;
      if (swapBtn) {
        swapBtn.click();
        await new Promise(r => setTimeout(r, 400));
        // Check if swapped
        if (originInput.value === 'Mysuru' && destInput.value === 'Bengaluru') {
          swapWorked = true;
          // Swap back to Bengaluru -> Mysuru
          swapBtn.click();
          await new Promise(r => setTimeout(r, 400));
        }
      }

      // 4. Click Calculate Route Button
      const calcBtn = buttons.find(b => 
        b.textContent.toLowerCase().includes('route') || 
        b.textContent.toLowerCase().includes('calculate') ||
        b.textContent.toLowerCase().includes('navigate')
      );

      let calcClicked = false;
      if (calcBtn) {
        calcBtn.click();
        calcClicked = true;
      }

      return {
        success: true,
        originVal: originInput.value,
        destVal: destInput.value,
        swapWorked,
        calcClicked
      };
    })()
  `);
  console.log('Safe Route Form Execution:', safeRouteTest);

  // Wait for route calculation network response
  await sleep(3500);

  const routeResultsInspection = await evalJs(`
    (() => {
      const text = document.body.innerText;
      const hasDistance = text.includes('km') || text.includes('Distance') || text.includes('ETA') || text.includes('min');
      const hasHazard = text.includes('Hazard') || text.includes('Safety') || text.includes('Safe') || text.includes('Risk');
      const hasSteps = text.includes('Turn') || text.includes('Head') || text.includes('Instructions') || text.includes('Route') || text.includes('Step');
      return { hasDistance, hasHazard, hasSteps };
    })()
  `);
  console.log('Safe Route Output Inspection:', routeResultsInspection);
  pageResults.push({
    page: '/safe-route',
    status: (safeRouteTest.success && routeResultsInspection.hasDistance) ? 'PASS' : 'FAIL',
    details: { ...safeRouteTest, ...routeResultsInspection }
  });

  // ============================================================
  // TEST 3: ALERTS & ADVISORIES
  // ============================================================
  console.log('\n--- [TEST 3] ALERTS & ADVISORIES PAGE ---');
  await navigate('/alerts');
  await sleep(1000);

  const alertsInspection = await evalJs(`
    (() => {
      const text = document.body.innerText;
      const hasAlertsHeader = text.includes('Alerts') || text.includes('Advisories');
      const filterBtns = Array.from(document.querySelectorAll('button')).filter(b => 
        b.textContent.includes('All') || b.textContent.includes('High') || b.textContent.includes('Critical') || b.textContent.includes('Active')
      );
      const cards = document.querySelectorAll('.alert-card, [data-testid="alert-card"], .border-red-500, .border-amber-500, .bg-card');
      return {
        hasAlertsHeader,
        filterBtnCount: filterBtns.length,
        cardCount: cards.length
      };
    })()
  `);
  console.log('Alerts Page Results:', alertsInspection);
  pageResults.push({ page: '/alerts', status: alertsInspection.hasAlertsHeader ? 'PASS' : 'FAIL', details: alertsInspection });

  // ============================================================
  // TEST 4: INCIDENTS EXPLORER
  // ============================================================
  console.log('\n--- [TEST 4] INCIDENTS EXPLORER PAGE ---');
  await navigate('/incidents');
  await sleep(1000);

  const incidentsInspection = await evalJs(`
    (() => {
      const text = document.body.innerText;
      const hasIncidents = text.includes('Incident') || text.includes('Landslide') || text.includes('Catalog');
      const searchInput = document.querySelector('input[placeholder*="search" i], input[placeholder*="filter" i], input[type="text"]');
      const items = document.querySelectorAll('.incident-item, [data-testid="incident-item"], tr, .card');
      return {
        hasIncidents,
        hasSearchInput: !!searchInput,
        itemCount: items.length
      };
    })()
  `);
  console.log('Incidents Page Results:', incidentsInspection);
  pageResults.push({ page: '/incidents', status: incidentsInspection.hasIncidents ? 'PASS' : 'FAIL', details: incidentsInspection });

  // ============================================================
  // TEST 5: ANALYTICS & TELEMETRY
  // ============================================================
  console.log('\n--- [TEST 5] ANALYTICS & TELEMETRY PAGE ---');
  await navigate('/analytics');
  await sleep(1500);

  const analyticsInspection = await evalJs(`
    (() => {
      const text = document.body.innerText;
      const isStuckLoading = text.includes('Aggregating Regional Landslide Telemetry') && !text.includes('Rainfall Distribution');
      const hasCharts = document.querySelectorAll('svg, canvas, .recharts-responsive-container').length > 0;
      const hasMetrics = text.includes('Rainfall') || text.includes('Moisture') || text.includes('Events') || text.includes('Risk');
      const retryBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.toLowerCase().includes('retry'));
      return {
        isStuckLoading,
        hasCharts,
        hasMetrics,
        hasRetryBtn: !!retryBtn
      };
    })()
  `);
  console.log('Analytics Page Results:', analyticsInspection);
  pageResults.push({
    page: '/analytics',
    status: (!analyticsInspection.isStuckLoading && (analyticsInspection.hasCharts || analyticsInspection.hasMetrics)) ? 'PASS' : 'FAIL',
    details: analyticsInspection
  });

  // ============================================================
  // TEST 6: ML PREDICTIONS & XAI
  // ============================================================
  console.log('\n--- [TEST 6] ML MODEL & PREDICTIONS PAGE ---');
  await navigate('/ml-model');
  await sleep(1000);

  const mlInspection = await evalJs(`
    (() => {
      const text = document.body.innerText;
      const hasML = text.includes('Machine Learning') || text.includes('Random Forest') || text.includes('Prediction') || text.includes('Feature');
      const hasProvenance = text.includes('Saabas') || text.includes('Contribution') || text.includes('Factor') || text.includes('Attribution');
      const hasMetrics = text.includes('Accuracy') || text.includes('ROC') || text.includes('AUC') || text.includes('LODO') || text.includes('Cross-Validation');
      return { hasML, hasProvenance, hasMetrics };
    })()
  `);
  console.log('ML Model Page Results:', mlInspection);
  pageResults.push({ page: '/ml-model', status: mlInspection.hasML ? 'PASS' : 'FAIL', details: mlInspection });

  // ============================================================
  // TEST 7: GIS HAZARD MAP
  // ============================================================
  console.log('\n--- [TEST 7] GIS HAZARD MAP PAGE ---');
  await navigate('/gis-map');
  await sleep(1500);

  const mapInspection = await evalJs(`
    (() => {
      const leaflet = document.querySelector('.leaflet-container');
      const tiles = document.querySelectorAll('.leaflet-tile');
      const layerControls = document.querySelectorAll('.leaflet-control-layers, [data-testid="layer-toggle"], button');
      return {
        hasLeaflet: !!leaflet,
        tileCount: tiles.length,
        controlCount: layerControls.length
      };
    })()
  `);
  console.log('GIS Map Results:', mapInspection);
  pageResults.push({ page: '/gis-map', status: mapInspection.hasLeaflet ? 'PASS' : 'FAIL', details: mapInspection });

  // ============================================================
  // TEST 8: COMMUNITY POLL
  // ============================================================
  console.log('\n--- [TEST 8] COMMUNITY POLL PAGE ---');
  await navigate('/community-poll');
  await sleep(1000);

  const pollInspection = await evalJs(`
    (() => {
      const text = document.body.innerText;
      const hasPoll = text.includes('Poll') || text.includes('Community') || text.includes('Survey') || text.includes('Question');
      const radioOptions = document.querySelectorAll('input[type="radio"], button');
      return { hasPoll, optionCount: radioOptions.length };
    })()
  `);
  console.log('Community Poll Results:', pollInspection);
  pageResults.push({ page: '/community-poll', status: pollInspection.hasPoll ? 'PASS' : 'FAIL', details: pollInspection });

  // ============================================================
  // TEST 9: EMERGENCY RESOURCES & HOSPITALS
  // ============================================================
  console.log('\n--- [TEST 9] EMERGENCY RESOURCES & HOSPITALS ---');
  await navigate('/resources');
  await sleep(1000);

  const resourcesInspection = await evalJs(`
    (() => {
      const text = document.body.innerText;
      const hasResources = text.includes('Emergency') || text.includes('Shelter') || text.includes('Hospital') || text.includes('Contact');
      const phoneLinks = Array.from(document.querySelectorAll('a[href^="tel:"]'));
      return { hasResources, phoneLinkCount: phoneLinks.length };
    })()
  `);
  console.log('Resources Results:', resourcesInspection);
  pageResults.push({ page: '/resources', status: resourcesInspection.hasResources ? 'PASS' : 'FAIL', details: resourcesInspection });

  // ============================================================
  // TEST 10: EMERGENCY SOS (SAFE VERIFICATION)
  // ============================================================
  console.log('\n--- [TEST 10] EMERGENCY SOS (SAFE MODE) ---');
  await navigate('/sos');
  await sleep(1000);

  const sosInspection = await evalJs(`
    (() => {
      const text = document.body.innerText;
      const hasSos = text.includes('SOS') || text.includes('Emergency') || text.includes('Distress');
      const sosBtn = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent.includes('SOS') || b.textContent.includes('EMERGENCY') || b.className.includes('red')
      );
      return { hasSos, hasSosBtn: !!sosBtn };
    })()
  `);
  console.log('SOS Results:', sosInspection);
  pageResults.push({ page: '/sos', status: sosInspection.hasSos ? 'PASS' : 'FAIL', details: sosInspection });

  // ============================================================
  // TEST 11: PROFILE & SETTINGS
  // ============================================================
  console.log('\n--- [TEST 11] PROFILE & SETTINGS ---');
  await navigate('/profile');
  await sleep(1000);

  const profileInspection = await evalJs(`
    (() => {
      const text = document.body.innerText;
      const hasProfile = text.includes('Profile') || text.includes('User') || text.includes('Account');
      const inputs = document.querySelectorAll('input');
      return { hasProfile, inputCount: inputs.length };
    })()
  `);
  console.log('Profile Results:', profileInspection);
  pageResults.push({ page: '/profile', status: profileInspection.hasProfile ? 'PASS' : 'FAIL', details: profileInspection });

  await navigate('/settings');
  await sleep(1000);

  const settingsInspection = await evalJs(`
    (() => {
      const text = document.body.innerText;
      const hasSettings = text.includes('Settings') || text.includes('Preferences') || text.includes('Theme');
      const toggles = document.querySelectorAll('input[type="checkbox"], button[role="switch"], select');
      return { hasSettings, toggleCount: toggles.length };
    })()
  `);
  console.log('Settings Results:', settingsInspection);
  pageResults.push({ page: '/settings', status: settingsInspection.hasSettings ? 'PASS' : 'FAIL', details: settingsInspection });

  // ============================================================
  // TEST 12: RESPONSIVE VIEWPORT TESTS
  // ============================================================
  console.log('\n--- [TEST 12] RESPONSIVE VIEWPORT TESTS ---');
  const viewports = [
    { name: 'Desktop 1440px', width: 1440, height: 900 },
    { name: 'Tablet 768px', width: 768, height: 1024 },
    { name: 'Mobile 390px', width: 390, height: 844 }
  ];

  const responsiveResults = [];
  for (const vp of viewports) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.width < 768
    });
    await navigate('/overview');
    await sleep(800);

    const vpCheck = await evalJs(`
      (() => {
        const hasHorizontalScroll = document.documentElement.scrollWidth > window.innerWidth;
        const main = document.querySelector('main, .main-content');
        return {
          viewport: window.innerWidth + 'x' + window.innerHeight,
          hasHorizontalScroll,
          mainRendered: !!main
        };
      })()
    `);
    console.log(`Viewport ${vp.name}:`, vpCheck);
    responsiveResults.push({ name: vp.name, passed: !vpCheck.hasHorizontalScroll && vpCheck.mainRendered });
  }

  // Summary output
  console.log('\n==================================================');
  console.log('BROWSER TEST SUMMARY REPORT');
  console.log('==================================================');
  console.log('PAGES TESTED:');
  for (const pr of pageResults) {
    console.log(` [${pr.status}] ${pr.page}`);
  }

  console.log('\nRESPONSIVE TESTS:');
  for (const rr of responsiveResults) {
    console.log(` [${rr.passed ? 'PASS' : 'FAIL'}] ${rr.name}`);
  }

  console.log('\nCONSOLE AUDIT:');
  console.log(` Critical Errors: ${consoleErrors.length}`);
  console.log(` Warnings: ${consoleWarnings.length}`);
  if (consoleErrors.length > 0) {
    console.log(' Sample Errors:');
    for (const err of consoleErrors.slice(0, 5)) {
      console.log(`  - ${err.slice(0, 100)}`);
    }
  }

  console.log('\nNETWORK AUDIT:');
  console.log(` Failed Requests: ${networkFailures.length}`);
  for (const f of networkFailures) {
    console.log(`  - HTTP ${f.status} -> ${f.url}`);
  }

  ws.close();
  chromeProc.kill();
  console.log('\nBrowser test execution completed.');
}

runSuite().catch(err => {
  console.error('Fatal suite runner error:', err);
  if (chromeProc) chromeProc.kill();
  process.exit(1);
});
