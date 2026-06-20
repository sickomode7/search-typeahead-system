const consistentHash = require('./consistentHash');

const TTL_MS = 60 * 1000;

class CacheLayer {
    constructor() {
        this.caches = {
            'cache-node-1': new Map(),
            'cache-node-2': new Map(),
            'cache-node-3': new Map()
        };
        
        this.metrics = {
            totalRequests: 0,
            hits: 0,
            misses: 0,
            nodeDistribution: {
                'cache-node-1': 0,
                'cache-node-2': 0,
                'cache-node-3': 0
            }
        };
    }

    getCached(node, key) {
        this.metrics.totalRequests++;
        this.metrics.nodeDistribution[node]++;
        
        const cacheMap = this.caches[node];
        const entry = cacheMap.get(key);
        
        if (entry) {
            const now = Date.now();
            const age = now - new Date(entry.cachedAt).getTime();
            
            if (age < TTL_MS) {
                this.metrics.hits++;
                console.log(`CACHE HIT [${node}] prefix=${key}`);
                return entry.suggestions;
            } else {
                // Evict expired
                cacheMap.delete(key);
            }
        }
        
        this.metrics.misses++;
        console.log(`CACHE MISS [${node}] prefix=${key}`);
        return null;
    }

    setCached(node, key, suggestions) {
        this.caches[node].set(key, {
            suggestions,
            cachedAt: new Date().toISOString()
        });
    }

    getDebugInfo(prefix) {
        const node = consistentHash.getNode(prefix);
        const entry = this.caches[node].get(prefix);
        
        let hit = false;
        let cachedAt = null;
        let ttlRemaining = null;
        
        if (entry) {
            const now = Date.now();
            const entryTime = new Date(entry.cachedAt).getTime();
            const age = now - entryTime;
            
            if (age < TTL_MS) {
                hit = true;
                cachedAt = entry.cachedAt;
                ttlRemaining = Math.max(0, Math.ceil((TTL_MS - age) / 1000));
            }
        }
        
        return {
            prefix,
            assignedNode: node,
            hit,
            cachedAt,
            ttlRemaining
        };
    }

    invalidatePrefix(prefix) {
        const node = consistentHash.getNode(prefix);
        if (node && this.caches[node].has(prefix)) {
            this.caches[node].delete(prefix);
            console.log(`CACHE INVALIDATED prefix=${prefix} reason=trending_update`);
        }
    }

    getStats() {
        const rate = this.metrics.totalRequests > 0 
            ? ((this.metrics.hits / this.metrics.totalRequests) * 100).toFixed(1) + '%'
            : '0.0%';
            
        return {
            totalRequests: this.metrics.totalRequests,
            hits: this.metrics.hits,
            misses: this.metrics.misses,
            hitRate: rate,
            nodeDistribution: this.metrics.nodeDistribution
        };
    }

    startMetricsLogger() {
        setInterval(() => {
            const stats = this.getStats();
            console.log(`[Cache Summary] Requests: ${stats.totalRequests} | Hits: ${stats.hits} | Misses: ${stats.misses} | HitRate: ${stats.hitRate}`);
        }, 60000);
    }
}

module.exports = new CacheLayer();
