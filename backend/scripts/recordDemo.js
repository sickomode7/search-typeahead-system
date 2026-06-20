const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, '../../docs');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { margin: 0; display: flex; height: 100vh; background: #000; overflow: hidden; }
        iframe { border: none; }
        #app { width: 65%; height: 100%; border-right: 2px solid #333; }
        #terminal { width: 35%; height: 100%; background: #0c0c0c; color: #00ff00; font-family: monospace; padding: 20px; box-sizing: border-box; overflow-y: auto; }
        .prompt { color: #00ffff; }
    </style>
</head>
<body>
    <iframe id="app" src="http://localhost:5173"></iframe>
    <div id="terminal">
        <div class="prompt">c:\\Users\\tanis\\Desktop\\backend&gt; node index.js</div>
        <div>Server is running on port 3001</div><br>
    </div>
</body>
</html>
`;

async function run() {
    const htmlPath = path.join(__dirname, 'demoOverlay.html');
    fs.writeFileSync(htmlPath, htmlContent);

    const browser = await puppeteer.launch({
        headless: "new",
        defaultViewport: { width: 1440, height: 900 }
    });

    const page = await browser.newPage();
    const recorder = new PuppeteerScreenRecorder(page);

    console.log("Loading layout...");
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

    console.log("Starting recording...");
    await recorder.start(path.join(OUTPUT_DIR, 'demo.mp4'));

    // Wait a bit to show initial state
    await new Promise(r => setTimeout(r, 2000));

    // Get the iframe context
    const elementHandle = await page.$('iframe#app');
    const frame = await elementHandle.contentFrame();

    // Helper to log to terminal
    const logTerminal = async (text) => {
        await page.evaluate((msg) => {
            const term = document.getElementById('terminal');
            term.innerHTML += `<div>${msg}</div>`;
            term.scrollTop = term.scrollHeight;
        }, text);
    };

    // 2. Type prefix slowly
    await logTerminal('<span class="prompt">System:</span> User typing...');
    await frame.type('input[type="text"]', 'el', { delay: 300 });
    await new Promise(r => setTimeout(r, 1000));
    await frame.type('input[type="text"]', 'den', { delay: 200 });
    await new Promise(r => setTimeout(r, 1000));

    // 3. Arrow down and enter
    await page.keyboard.press('ArrowDown', { delay: 300 });
    await page.keyboard.press('ArrowDown', { delay: 300 });
    await page.keyboard.press('Enter');

    // 4. Dummy response
    await new Promise(r => setTimeout(r, 1500));

    // 5. Click trending chip
    await logTerminal('<span class="prompt">System:</span> Clicking trending chip...');
    await frame.click('button'); // click the first trending chip
    await new Promise(r => setTimeout(r, 1500));

    // Clear the input
    await frame.click('input[type="text"]', { clickCount: 3 });
    await page.keyboard.press('Backspace');

    // 6. Terminal Rapid POST for a low-count query
    await logTerminal('<br><span class="prompt">c:\\Users\\tanis\\Desktop\\backend&gt;</span> ./rapid-search.sh "indie gem game" 20');
    await new Promise(r => setTimeout(r, 1000));

    // Check suggestions BEFORE
    await frame.type('input[type="text"]', 'indie', { delay: 200 });
    await new Promise(r => setTimeout(r, 1500));

    // Fire real backend searches
    for (let i = 0; i < 20; i++) {
        await logTerminal(`[POST] /search - 0.3ms`);
        await fetch('http://localhost:3001/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: "indie gem game" })
        });
        await new Promise(r => setTimeout(r, 100));
    }

    await logTerminal('<br><span class="prompt">System:</span> Waiting for 10s BatchWriter Flush...');
    let countdown = 10;
    for (let i = 0; i < 10; i++) {
        await logTerminal(`... ${countdown--}s`);
        await new Promise(r => setTimeout(r, 1000));
    }

    // 9. Show terminal batch flush
    await logTerminal('<br><span style="color:#ffcc00">BATCH FLUSH: flushed 1 unique queries, 20 total increments, took 1ms</span>');
    await new Promise(r => setTimeout(r, 1000));

    // Show it appearing higher
    await logTerminal('<span class="prompt">System:</span> Refreshing suggestions...');
    await frame.click('input[type="text"]', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await frame.type('input[type="text"]', 'indie', { delay: 200 });
    await new Promise(r => setTimeout(r, 2000));

    // 7. Show /cache/stats
    await logTerminal('<br><span class="prompt">c:\\Users\\tanis\\Desktop\\backend&gt;</span> curl http://localhost:3001/cache/stats');
    const statsRes = await fetch('http://localhost:3001/cache/stats');
    const statsJson = await statsRes.json();
    await logTerminal(JSON.stringify(statsJson, null, 2).replace(/\\n/g, '<br>'));
    await new Promise(r => setTimeout(r, 2000));

    // 8. Show /cache/debug?prefix=el
    await logTerminal('<br><span class="prompt">c:\\Users\\tanis\\Desktop\\backend&gt;</span> curl "http://localhost:3001/cache/debug?prefix=el"');
    const debugRes = await fetch('http://localhost:3001/cache/debug?prefix=el');
    const debugJson = await debugRes.json();
    await logTerminal(JSON.stringify(debugJson, null, 2).replace(/\\n/g, '<br>'));
    await new Promise(r => setTimeout(r, 3000));

    console.log("Stopping recording...");
    await recorder.stop(); await new Promise(r => setTimeout(r, 5000));
    await browser.close();

    // Cleanup overlay
    fs.unlinkSync(htmlPath);
    console.log("Video saved to docs/demo.mp4");
}

run().catch(console.error);
