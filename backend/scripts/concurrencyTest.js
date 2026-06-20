const BASE_URL = "http://localhost:3001";

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    return res.json();
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

const results = [];

// ─── Test 1: Parallel suggest requests (cache correctness) ───────────────────
async function test1() {
    console.log("\n▶ Test 1: Parallel suggest requests (cache correctness)");
    try {
        const responses = await Promise.all(
            Array(50)
                .fill(null)
                .map(() => fetchJSON(`${BASE_URL}/suggest?q=el`))
        );

        const unique = new Set(responses.map((r) => JSON.stringify(r.suggestions)));
        const pass = unique.size === 1 && responses.every((r) => Array.isArray(r.suggestions));

        console.log(`  Unique response shapes: ${unique.size} (expected 1)`);
        console.log(`  Result: ${pass ? "PASS ✓" : "FAIL ✗"}`);
        results.push({ name: "Parallel suggest (cache correctness)", pass });
    } catch (err) {
        console.error("  ERROR:", err.message);
        results.push({ name: "Parallel suggest (cache correctness)", pass: false });
    }
}

// ─── Test 2: Parallel search submissions (batch writer race conditions) ───────
async function test2() {
    console.log("\n▶ Test 2: Parallel batch writes (count accuracy)");
    const QUERY = "concurrent test game";
    const COUNT = 100;

    try {
        await Promise.all(
            Array(COUNT)
                .fill(null)
                .map(() =>
                    fetchJSON(`${BASE_URL}/search`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ query: QUERY }),
                    })
                )
        );

        console.log(`  Fired ${COUNT} POST /search simultaneously`);
        console.log("  Waiting 15s for batch flush...");
        await sleep(15000);

        const res = await fetchJSON(`${BASE_URL}/suggest?q=con`);
        const match = res.suggestions?.find((s) => s.query === QUERY);
        const gotCount = match?.count ?? 0;

        // Allow ±10 for timing edge cases across flush windows
        const pass = gotCount >= COUNT - 10;
        console.log(`  Expected count: ~${COUNT}, got: ${gotCount}`);
        console.log(`  Result: ${pass ? "PASS ✓" : "FAIL ✗"}`);
        results.push({ name: `Parallel batch writes (expected ~${COUNT}, got ${gotCount})`, pass });
    } catch (err) {
        console.error("  ERROR:", err.message);
        results.push({ name: "Parallel batch writes (count accuracy)", pass: false });
    }
}

// ─── Test 3: Mixed parallel load (suggest + search simultaneously) ────────────
async function test3() {
    console.log("\n▶ Test 3: Mixed parallel load (no errors)");
    const TOTAL = 200;

    try {
        const requests = [
            ...Array(100)
                .fill(null)
                .map(() => fetchJSON(`${BASE_URL}/suggest?q=el`)),
            ...Array(100)
                .fill(null)
                .map(() =>
                    fetchJSON(`${BASE_URL}/search`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ query: "elden ring" }),
                    })
                ),
        ];

        const responses = await Promise.all(requests);
        const errors = responses.filter((r) => !r.suggestions && !r.message);
        const pass = errors.length === 0;

        console.log(`  ${TOTAL - errors.length}/${TOTAL} requests succeeded`);
        console.log(`  Result: ${pass ? "PASS ✓" : "FAIL ✗"}`);
        results.push({ name: `Mixed load (${TOTAL - errors.length}/${TOTAL} succeeded)`, pass });
    } catch (err) {
        console.error("  ERROR:", err.message);
        results.push({ name: "Mixed load (no errors)", pass: false });
    }
}

// ─── Test 4: Cache node distribution under parallel load ──────────────────────
async function test4() {
    console.log("\n▶ Test 4: Cache node distribution under parallel load");

    const prefixes = [
        "el", "ma", "fi", "ro", "co", "go", "wi", "ha", "sp", "dr",
        "bl", "cr", "st", "po", "mo", "le", "fr", "wa", "da", "ki",
        "pl", "qu", "tr", "ve", "zo", "ab", "ch", "di", "en", "fl",
    ];

    try {
        // Hit all prefixes in parallel to populate cache
        await Promise.all(prefixes.map((p) => fetchJSON(`${BASE_URL}/suggest?q=${p}`)));

        // Now check distribution
        const debugResults = await Promise.all(
            prefixes.map((p) => fetchJSON(`${BASE_URL}/cache/debug?prefix=${p}`))
        );

        const distribution = {};
        for (const r of debugResults) {
            const node = r.assignedNode;
            if (node) distribution[node] = (distribution[node] || 0) + 1;
        }

        const nodeCount = Object.keys(distribution).length;
        const pass = nodeCount >= 2; // at least 2 of 3 nodes got keys

        console.log("  Node distribution:");
        for (const [node, count] of Object.entries(distribution)) {
            console.log(`    ${node}: ${count} prefixes`);
        }
        console.log(`  Result: ${pass ? "PASS ✓" : "FAIL ✗"} (${nodeCount}/3 nodes received keys)`);
        results.push({
            name: `Cache distribution (${Object.entries(distribution)
                .map(([n, c]) => `${n}: ${c}`)
                .join(", ")})`,
            pass,
        });
    } catch (err) {
        console.error("  ERROR:", err.message);
        results.push({ name: "Cache node distribution", pass: false });
    }
}

// ─── Run all tests ────────────────────────────────────────────────────────────
async function run() {
    console.log("=== CONCURRENCY TESTS ===");
    console.log(`Target: ${BASE_URL}\n`);

    await test1();
    await test2();
    await test3();
    await test4();

    console.log("\n=== CONCURRENCY TEST RESULTS ===");
    for (const r of results) {
        console.log(`${r.pass ? "✓ PASS" : "✗ FAIL"} — ${r.name}`);
    }

    const allPassed = results.every((r) => r.pass);
    console.log(`\nOverall: ${allPassed ? "ALL PASSED ✓" : "SOME FAILED ✗"}`);
    process.exit(allPassed ? 0 : 1);
}

run();
