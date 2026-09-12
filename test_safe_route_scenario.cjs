// Specific verification for Safe Route Top Search vs Map State Separation
const { spawn } = require('child_process');

const CDP_PORT = 9556;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function runTest() {
  console.log('==================================================');
  console.log('SAFE ROUTE SPECIFIC SCENARIO VERIFICATION');
  console.log('==================================================');

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--window-size=1440,900',
    '--user-data-dir=C:\\Users\\Pro 5\\AppData\\Local\\Temp\\chrome_qa_route',
    'http://127.0.0.1:5177/safe-route'
  ]);

  try {
    await new Promise(r => setTimeout(r, 2500));

    const listRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const pages = await listRes.json();
    const target = pages.find(p => p.url.includes('5177')) || pages[0];

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        const handler = (evt) => {
          const data = JSON.parse(evt.data);
          if (data.id === id) {
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

    const networkRequests = [];
    ws.addEventListener('message', (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.method === 'Network.requestWillBeSent') {
          const url = msg.params.request.url;
          if (url.includes('/api/safe-route')) {
            networkRequests.push({
              url,
              postData: msg.params.request.postData
            });
            console.log(`-> Routing Network Request: ${url}`, msg.params.request.postData || '');
          }
        }
      } catch (_) {}
    });

    await new Promise(r => setTimeout(r, 2000));

    // Inspect initial input values
    const initialInputs = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
          return inputs.map(i => ({ placeholder: i.placeholder, value: i.value }));
        })()
      `,
      returnByValue: true
    });
    console.log('Initial Inputs:', initialInputs.result.value);

    // Enter Bengaluru into Origin and Mysuru into Destination using React-friendly setter
    const setInputsResult = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const setVal = (input, val) => {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(input, val);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          };

          const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
          const originInput = inputs[0];
          const destInput = inputs[1];

          setVal(originInput, 'Bengaluru');
          setVal(destInput, 'Mysuru');

          return {
            originNow: originInput.value,
            destNow: destInput.value
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Inputs After Typing:', setInputsResult.result.value);

    // Test Swap Button
    const swapResult = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const swapBtn = document.querySelector('button[title*="Swap" i], button[title*="swap" i]');
          if (!swapBtn) return { error: 'Swap button not found' };
          swapBtn.click();
          const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
          return {
            swappedOrigin: inputs[0].value,
            swappedDest: inputs[1].value
          };
        })()
      `,
      returnByValue: true
    });
    console.log('After Swap Click:', swapResult.result.value);

    // Swap back to Bengaluru -> Mysuru
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const swapBtn = document.querySelector('button[title*="Swap" i], button[title*="swap" i]');
          if (swapBtn) swapBtn.click();
        })()
      `
    });
    await new Promise(r => setTimeout(r, 400));

    // Submit Form / Click Route Button
    console.log('Submitting Route Calculation for Bengaluru -> Mysuru...');
    const submitResult = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const form = document.querySelector('form');
          if (form) {
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            return { submitted: true };
          }
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.type === 'submit');
          if (btn) {
            btn.click();
            return { clicked: true };
          }
          return { error: 'No submit button/form found' };
        })()
      `,
      returnByValue: true
    });
    console.log('Submission Trigger:', submitResult.result.value);

    // Wait for route calculation
    await new Promise(r => setTimeout(r, 4000));

    // Verify Output & Map State
    const finalCheck = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
          const originVal = inputs[0]?.value;
          const destVal = inputs[1]?.value;

          const pageText = document.body.innerText;
          const hasBengaluru = pageText.includes('Bengaluru') || pageText.includes('Bangalore');
          const hasMysuru = pageText.includes('Mysuru') || pageText.includes('Mysore');
          const distanceMatch = pageText.match(/(\\d+(\\.\\d+)?)\\s*km/);
          const etaMatch = pageText.match(/(\\d+(\\.\\d+)?)\\s*(min|hr|hours)/);

          return {
            originVal,
            destVal,
            hasBengaluru,
            hasMysuru,
            distance: distanceMatch ? distanceMatch[0] : null,
            eta: etaMatch ? etaMatch[0] : null
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Final Route Verification:', finalCheck.result.value);

    // Verify Top Search input values remained Bengaluru -> Mysuru
    const res = finalCheck.result.value;
    const passed = res.originVal === 'Bengaluru' && res.destVal === 'Mysuru' && res.distance !== null;
    console.log('==================================================');
    console.log(`SAFE ROUTE TEST RESULT: ${passed ? 'PASSED [OK]' : 'FAILED'}`);
    console.log(`Distance: ${res.distance}, ETA: ${res.eta}`);
    console.log('==================================================');

    ws.close();
  } finally {
    chromeProc.kill();
  }
}

runTest().catch(console.error);
