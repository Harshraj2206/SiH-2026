// Production verification script using Chrome CDP
const { spawn } = require('child_process');

const PROD_URL = 'https://si-h-2026.vercel.app';
const CDP_PORT = 9557;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function runProdTest() {
  console.log('==================================================');
  console.log('TESTING PRODUCTION: https://si-h-2026.vercel.app');
  console.log('==================================================');

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--window-size=1440,900',
    '--user-data-dir=C:\\Users\\Pro 5\\AppData\\Local\\Temp\\chrome_prod_temp',
    `${PROD_URL}/overview`
  ]);

  try {
    await new Promise(r => setTimeout(r, 3000));

    const listRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const pages = await listRes.json();
    const target = pages.find(p => p.url.includes('vercel.app')) || pages[0];

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        const timer = setTimeout(() => reject(new Error(`Timeout: ${method}`)), 15000);
        const handler = (evt) => {
          const data = JSON.parse(evt.data);
          if (data.id === id) {
            clearTimeout(timer);
            ws.removeEventListener('message', handler);
            resolve(data.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Network.enable');

    const consoleLogs = [];
    const failedNetwork = [];

    ws.addEventListener('message', (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.method === 'Runtime.consoleAPICalled') {
          const type = msg.params.type;
          const text = (msg.params.args || []).map(a => a.value || a.description || '').join(' ');
          if (type === 'error') consoleLogs.push(text);
        }
        if (msg.method === 'Network.responseReceived') {
          const status = msg.params.response.status;
          const url = msg.params.response.url;
          if (status >= 400 && !url.includes('favicon')) {
            failedNetwork.push({ url, status });
          }
        }
      } catch (_) {}
    });

    await new Promise(r => setTimeout(r, 4000));

    const check = await send('Runtime.evaluate', {
      expression: `
        (() => {
          return {
            title: document.title,
            bodySnippet: document.body.innerText.slice(0, 300),
            hasWeather: document.body.innerText.includes('Precipitation') || document.body.innerText.includes('Weather'),
            hasRisk: document.body.innerText.includes('Risk') || document.body.innerText.includes('MODERATE') || document.body.innerText.includes('LOW'),
            hasLeaflet: !!document.querySelector('.leaflet-container')
          };
        })()
      `,
      returnByValue: true
    });

    console.log('Production Overview Check:', check.result.value);
    console.log('Production Failed Network Requests:', failedNetwork);
    console.log('Production Console Errors:', consoleLogs.slice(0, 5));

    ws.close();
  } finally {
    chromeProc.kill();
  }
}

runProdTest().catch(console.error);
