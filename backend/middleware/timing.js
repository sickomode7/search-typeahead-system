const cacheLayer = require('../services/cache');

let latencies = {
    hits: [],
    misses: []
};

function getPercentile(data, percentile) {
    if (data.length === 0) return 0;
    data.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * data.length) - 1;
    return data[index].toFixed(2);
}

function printStats() {
    if (latencies.hits.length === 0 && latencies.misses.length === 0) return;

    const hitP50 = getPercentile(latencies.hits, 50);
    const hitP95 = getPercentile(latencies.hits, 95);
    const hitP99 = getPercentile(latencies.hits, 99);

    const missP50 = getPercentile(latencies.misses, 50);
    const missP95 = getPercentile(latencies.misses, 95);
    const missP99 = getPercentile(latencies.misses, 99);

    const cacheStats = cacheLayer.getStats();
    
    console.log(`\n--- [Timing Stats] ---`);
    console.log(`Cache Hit Rate: ${cacheStats.hitRate} (Hits: ${cacheStats.hits}, Misses: ${cacheStats.misses})`);
    console.log(`Hits (${latencies.hits.length} reqs) -> p50: ${hitP50}ms | p95: ${hitP95}ms | p99: ${hitP99}ms`);
    console.log(`Misses (${latencies.misses.length} reqs) -> p50: ${missP50}ms | p95: ${missP95}ms | p99: ${missP99}ms`);
    console.log(`----------------------\n`);

    // Reset arrays
    latencies.hits = [];
    latencies.misses = [];
}

// Print stats every 60 seconds
setInterval(printStats, 60 * 1000);

function timingMiddleware(req, res, next) {
    if (!req.path.startsWith('/suggest')) {
        return next();
    }

    const start = process.hrtime();

    res.on('finish', () => {
        const diff = process.hrtime(start);
        const timeMs = (diff[0] * 1e3) + (diff[1] * 1e-6);

        // Check our custom header to determine cache hit vs miss
        const cacheStatus = res.getHeader('X-Cache');
        if (cacheStatus === 'HIT') {
            latencies.hits.push(timeMs);
        } else if (cacheStatus === 'MISS') {
            latencies.misses.push(timeMs);
        }
    });

    next();
}

module.exports = timingMiddleware;
