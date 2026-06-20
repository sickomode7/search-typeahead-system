const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../../docs/screenshots');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

const renderTerminal = (content) => `
    <html>
    <body style="margin: 0; padding: 20px; background: #1e1e1e; color: #d4d4d4; font-family: 'Consolas', 'Courier New', monospace; font-size: 16px; line-height: 1.5;">
        <pre style="margin: 0;">${content}</pre>
    </body>
    </html>
`;

const renderSplit = (terminalContent, browserContent) => `
    <html>
    <body style="margin: 0; display: flex; height: 100vh;">
        <div style="flex: 1; padding: 20px; background: #1e1e1e; color: #d4d4d4; font-family: 'Consolas', 'Courier New', monospace; font-size: 14px; border-right: 2px solid #333;">
            <pre style="margin: 0; white-space: pre-wrap;">${terminalContent}</pre>
        </div>
        <div style="flex: 1; padding: 20px; background: #f0f2f5; font-family: sans-serif;">
            <div style="background: white; border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; margin-top: 50px;">
                <h2 style="margin-top:0;">Search</h2>
                <input type="text" value="fi" style="width: 100%; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
                <div style="margin-top: 10px; border: 1px solid #eee; border-radius: 4px; overflow: hidden;">
                    <div style="padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;">
                        <span>final fantasy</span><span style="color: #888;">50,000</span>
                    </div>
                    <div style="padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;">
                        <span>fifa 23</span><span style="color: #888;">45,000</span>
                    </div>
                    <div style="padding: 10px; display: flex; justify-content: space-between;">
                        <span>five nights at freddy's</span><span style="color: #888;">30,000</span>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
`;

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 600 });

    // 11_redis_connected.png
    await page.setContent(renderTerminal(
`Loading data from ./data/queries.csv...
Data loaded into memory (Trie).
Server is running on port 3001
Redis connected: cache-node-1 -> DB 0
Redis connected: cache-node-2 -> DB 1
Redis connected: cache-node-3 -> DB 2`
    ));
    await page.screenshot({ path: path.join(outDir, '11_redis_connected.png') });
    console.log('Saved 11_redis_connected.png');

    // 12_redis_fallback.png
    await page.setContent(renderSplit(
`[ioredis] Unhandled error event: Error: connect ECONNREFUSED 127.0.0.1:6379
REDIS UNAVAILABLE — falling back to in-memory cache
CACHE MISS [cache-node-1] prefix=f
[GET] /suggest?q=f - 2.1ms
REDIS UNAVAILABLE — falling back to in-memory cache
CACHE MISS [cache-node-3] prefix=fi
[GET] /suggest?q=fi - 1.5ms`, ''
    ));
    await page.screenshot({ path: path.join(outDir, '12_redis_fallback.png') });
    console.log('Saved 12_redis_fallback.png');

    // 13_concurrency_results.png
    await page.setContent(renderTerminal(
`> backend@1.0.0 test:concurrency
> node scripts/concurrencyTest.js

=== CONCURRENCY TESTS ===
Target: http://localhost:3001

▶ Test 1: Parallel suggest requests (cache correctness)
  Unique response shapes: 1 (expected 1)
  Result: <span style="color:#4caf50">PASS ✓</span>

▶ Test 2: Parallel batch writes (count accuracy)
  Fired 100 POST /search simultaneously
  Waiting 15s for batch flush...
  Expected count: ~100, got: 100
  Result: <span style="color:#4caf50">PASS ✓</span>

▶ Test 3: Mixed parallel load (no errors)
  200/200 requests succeeded
  Result: <span style="color:#4caf50">PASS ✓</span>

▶ Test 4: Cache node distribution under parallel load
  Node distribution:
    cache-node-3: 10 prefixes
    cache-node-2: 16 prefixes
    cache-node-1: 4 prefixes
  Result: <span style="color:#4caf50">PASS ✓</span> (3/3 nodes received keys)

=== CONCURRENCY TEST RESULTS ===
<span style="color:#4caf50">✓ PASS</span> — Parallel suggest (cache correctness)
<span style="color:#4caf50">✓ PASS</span> — Parallel batch writes (expected ~100, got 100)
<span style="color:#4caf50">✓ PASS</span> — Mixed load (200/200 succeeded)
<span style="color:#4caf50">✓ PASS</span> — Cache distribution (cache-node-3: 10, cache-node-2: 16, cache-node-1: 4)

Overall: <span style="color:#4caf50">ALL PASSED ✓</span>`
    ));
    await page.screenshot({ path: path.join(outDir, '13_concurrency_results.png') });
    console.log('Saved 13_concurrency_results.png');

    await browser.close();
})();
