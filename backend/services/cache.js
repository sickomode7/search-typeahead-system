const Redis = require('ioredis');
const consistentHash = require('./consistentHash');

const TTL_SEC = 60;
const TTL_MS = TTL_SEC * 1000;

class CacheLayer {
    constructor() {
        // Fallback in-memory map caches
        this.fallbackCaches = {
            'cache-node-1': new Map(),
            'cache-node-2': new Map(),
            'cache-node-3': new Map()
        };
        
        // Redis configuration from environment variables
        const redisHost = process.env.REDIS_HOST || 'localhost';
        const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379;

        // Redis caches
        this.redisClients = {
            "cache-node-1": new Redis({ host: redisHost, port: redisPort, db: 0, enableOfflineQueue: false, maxRetriesPerRequest: 0 }),
            "cache-node-2": new Redis({ host: redisHost, port: redisPort, db: 1, enableOfflineQueue: false, maxRetriesPerRequest: 0 }),
            "cache-node-3": new Redis({ host: redisHost, port: redisPort, db: 2, enableOfflineQueue: false, maxRetriesPerRequest: 0 }),
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

        // Suppress unhandled errors from disconnected Redis on startup, log success
        for (const [node, client] of Object.entries(this.redisClients)) {
            client.on('error', (err) => {
                // Redis throws continuously when disconnected, keep it quiet
            });
            client.on('ready', () => {
                console.log(`Redis connected: ${node} -> DB ${client.options.db}`);
            });
        }
    }

    async getCached(node, key) {
        this.metrics.totalRequests++;
        this.metrics.nodeDistribution[node]++;
        
        try {
            const redisClient = this.redisClients[node];
            const result = await redisClient.get(key);
            if (result) {
                this.metrics.hits++;
                console.log(`CACHE HIT [${node}] prefix=${key}`);
                return JSON.parse(result);
            }
        } catch (error) {
            console.warn("REDIS UNAVAILABLE — falling back to in-memory cache");
            const cacheMap = this.fallbackCaches[node];
            const entry = cacheMap.get(key);
            
            if (entry) {
                const now = Date.now();
                const age = now - new Date(entry.cachedAt).getTime();
                
                if (age < TTL_MS) {
                    this.metrics.hits++;
                    console.log(`CACHE HIT [${node}] prefix=${key} (fallback)`);
                    return entry.suggestions;
                } else {
                    cacheMap.delete(key);
                }
            }
        }
        
        this.metrics.misses++;
        console.log(`CACHE MISS [${node}] prefix=${key}`);
        return null;
    }

    async setCached(node, key, suggestions) {
        try {
            const redisClient = this.redisClients[node];
            await redisClient.setex(key, TTL_SEC, JSON.stringify(suggestions));
        } catch (error) {
            console.warn("REDIS UNAVAILABLE — falling back to in-memory cache");
            this.fallbackCaches[node].set(key, {
                suggestions,
                cachedAt: new Date().toISOString()
            });
        }
    }

    async getDebugInfo(prefix) {
        const node = consistentHash.getNode(prefix);
        let hit = false;
        let cachedAt = null;
        let ttlRemaining = null;
        let redisDb = null;
        
        try {
            const redisClient = this.redisClients[node];
            redisDb = redisClient.options.db;
            const exists = await redisClient.exists(prefix);
            if (exists) {
                hit = true;
                ttlRemaining = await redisClient.ttl(prefix);
                cachedAt = new Date().toISOString(); // Redis doesn't store exact timestamp inherently
            }
        } catch (error) {
            console.warn("REDIS UNAVAILABLE — falling back to in-memory cache");
            const entry = this.fallbackCaches[node].get(prefix);
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
        }
        
        return {
            prefix,
            assignedNode: node,
            redisDb,
            hit,
            cachedAt,
            ttlRemaining
        };
    }

    async invalidatePrefix(prefix) {
        const node = consistentHash.getNode(prefix);
        if (!node) return;
        
        try {
            const redisClient = this.redisClients[node];
            const result = await redisClient.del(prefix);
            if (result > 0) {
                console.log(`CACHE INVALIDATED prefix=${prefix} reason=trending_update`);
            }
        } catch (error) {
            console.warn("REDIS UNAVAILABLE — falling back to in-memory cache");
            if (this.fallbackCaches[node].has(prefix)) {
                this.fallbackCaches[node].delete(prefix);
                console.log(`CACHE INVALIDATED prefix=${prefix} reason=trending_update (fallback)`);
            }
        }
    }

    async getStats() {
        const rate = this.metrics.totalRequests > 0 
            ? ((this.metrics.hits / this.metrics.totalRequests) * 100).toFixed(1) + '%'
            : '0.0%';
            
        let nodeDistribution = {};
        
        try {
            for (const [nodeName, client] of Object.entries(this.redisClients)) {
                const info = await client.info('keyspace');
                let keysCount = 0;
                // info looks like "db0:keys=5,expires=5,avg_ttl=123"
                const match = info.match(/keys=(\d+)/);
                if (match) {
                    keysCount = parseInt(match[1], 10);
                }
                nodeDistribution[nodeName] = { db: client.options.db, keys: keysCount };
            }
        } catch (error) {
            console.warn("REDIS UNAVAILABLE — falling back to in-memory cache stats");
            for (const [nodeName, cacheMap] of Object.entries(this.fallbackCaches)) {
                nodeDistribution[nodeName] = { db: parseInt(nodeName.split("-")[2], 10) - 1, keys: cacheMap.size };
            }
        }
            
        return {
            totalRequests: this.metrics.totalRequests,
            hits: this.metrics.hits,
            misses: this.metrics.misses,
            hitRate: rate,
            nodeDistribution
        };
    }

    startMetricsLogger() {
        setInterval(async () => {
            const stats = await this.getStats();
            console.log(`[Cache Summary] Requests: ${stats.totalRequests} | Hits: ${stats.hits} | Misses: ${stats.misses} | HitRate: ${stats.hitRate}`);
        }, 60000);
    }
}

module.exports = new CacheLayer();
