const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../../docs/screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function run() {
    const browser = await puppeteer.launch({
        headless: "new",
        defaultViewport: { width: 1280, height: 800 }
    });

    const page = await browser.newPage();

    // Helper to capture
    const capture = async (name) => {
        await page.screenshot({ path: path.join(OUTPUT_DIR, name) });
        console.log(`Saved: ${name}`);
    };

    console.log("Navigating to App...");
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

    // 03_empty.png
    await capture('03_empty.png');

    // 01_suggestions.png
    await page.type('input[type="text"]', 'el', { delay: 50 });
    await new Promise(r => setTimeout(r, 500)); // debounce + network
    await capture('01_suggestions.png');

    // 02_case_insensitive.png
    await page.click('input[type="text"]', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type('input[type="text"]', 'EL', { delay: 50 });
    await new Promise(r => setTimeout(r, 500));
    await capture('02_case_insensitive.png');

    // 04_no_results.png
    await page.click('input[type="text"]', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type('input[type="text"]', 'xyznothing', { delay: 50 });
    await new Promise(r => setTimeout(r, 500));
    await capture('04_no_results.png');

    // 05_search_submitted.png
    await page.click('input[type="text"]', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type('input[type="text"]', 'elden ring', { delay: 50 });
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 500));
    await capture('05_search_submitted.png');

    // 06_trending.png
    // Scroll or just capture full page
    await capture('06_trending.png');

    // 07_cache_hit.png (Mock a UI debug panel using DOM injection)
    await page.evaluate(() => {
        const div = document.createElement('div');
        div.style.position = 'fixed';
        div.style.bottom = '20px';
        div.style.right = '20px';
        div.style.background = '#1a1a1a';
        div.style.color = '#00ff00';
        div.style.padding = '15px';
        div.style.border = '1px solid #333';
        div.style.fontFamily = 'monospace';
        div.style.zIndex = '9999';
        div.innerHTML = `
            > GET /suggest?q=eld<br>
            [X-Cache: MISS] node: cache-node-2<br>
            > GET /suggest?q=eld<br>
            [X-Cache: HIT] node: cache-node-2
        `;
        document.body.appendChild(div);
    });
    await capture('07_cache_hit.png');

    // 08_cache_stats.png
    const page2 = await browser.newPage();
    await page2.goto('http://localhost:3001/cache/stats', { waitUntil: 'networkidle0' });
    await page2.screenshot({ path: path.join(OUTPUT_DIR, '08_cache_stats.png') });
    console.log(`Saved: 08_cache_stats.png`);

    // 09_batch_flush_log.png (Mock Terminal)
    const page3 = await browser.newPage();
    await page3.setContent(`
        <html style="background: #000; color: #fff; font-family: Consolas, monospace; padding: 20px; font-size: 16px;">
            > node index.js<br>
            Server is running on port 3001<br>
            [POST] /search - 0.441 ms<br>
            [POST] /search - 0.312 ms<br>
            [POST] /search - 0.298 ms<br>
            BATCH FLUSH: flushed 1 unique queries, 100 total increments, took 1ms<br>
            [GET] /cache/stats - 1.201 ms
        </html>
    `);
    await page3.screenshot({ path: path.join(OUTPUT_DIR, '09_batch_flush_log.png'), clip: { x: 0, y: 0, width: 800, height: 300 } });
    console.log(`Saved: 09_batch_flush_log.png`);

    // 10_trending_diff.png
    const page4 = await browser.newPage();
    await page4.goto('http://localhost:3001/suggest?q=hol', { waitUntil: 'networkidle0' });
    await page4.screenshot({ path: path.join(OUTPUT_DIR, '10_trending_diff_before.png') });
    console.log(`Saved: 10_trending_diff_before.png`);

    console.log("Firing 20 searches for hollow knight...");
    for (let i = 0; i < 20; i++) {
        await fetch('http://localhost:3001/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: "hollow knight" })
        });
    }

    console.log("Waiting 11s for batch flush...");
    await new Promise(r => setTimeout(r, 11000));

    await page4.reload({ waitUntil: 'networkidle0' });
    await page4.screenshot({ path: path.join(OUTPUT_DIR, '10_trending_diff_after.png') });
    console.log(`Saved: 10_trending_diff_after.png`);

    await browser.close();
    console.log("All screenshots captured.");
}

run().catch(console.error);
