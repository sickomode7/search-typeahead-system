const http = require('http');

const URL = 'http://localhost:3001/suggest?q=el';
const DURATION_MS = 10000; // 10 seconds
const CONCURRENCY = 100; // In-flight requests

let totalRequests = 0;
let errorCount = 0;
const latencies = [];
const start = Date.now();

function makeRequest(callback) {
    const reqStart = process.hrtime();
    http.get(URL, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            const diff = process.hrtime(reqStart);
            const timeMs = (diff[0] * 1e3) + (diff[1] * 1e-6);
            if (res.statusCode === 200) {
                totalRequests++;
                latencies.push(timeMs);
            } else {
                errorCount++;
            }
            callback();
        });
    }).on('error', (err) => {
        errorCount++;
        callback();
    });
}

function worker() {
    if (Date.now() - start < DURATION_MS) {
        makeRequest(worker);
    }
}

console.log(`Starting load test against ${URL}`);
console.log(`Duration: ${DURATION_MS / 1000}s, Concurrency: ${CONCURRENCY}`);

for (let i = 0; i < CONCURRENCY; i++) {
    worker();
}

setTimeout(() => {
    latencies.sort((a, b) => a - b);
    const durationSec = DURATION_MS / 1000;
    const rps = (totalRequests / durationSec).toFixed(2);
    
    const p50 = latencies[Math.ceil(latencies.length * 0.50) - 1]?.toFixed(2) || 0;
    const p95 = latencies[Math.ceil(latencies.length * 0.95) - 1]?.toFixed(2) || 0;
    const p99 = latencies[Math.ceil(latencies.length * 0.99) - 1]?.toFixed(2) || 0;

    console.log(`\n--- Load Test Results ---`);
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Error Rate: ${((errorCount / (totalRequests + errorCount)) * 100).toFixed(2)}% (${errorCount} errors)`);
    console.log(`Requests/sec: ${rps}`);
    console.log(`Latency p50: ${p50}ms`);
    console.log(`Latency p95: ${p95}ms`);
    console.log(`Latency p99: ${p99}ms`);
}, DURATION_MS + 1000);
