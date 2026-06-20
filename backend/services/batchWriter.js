const { incrementQuery, getQueryDetails } = require('./dataStore');
const trendingTracker = require('./trendingTracker');
const cacheLayer = require('./cache');

/*
Failure Trade-offs

1. What happens to buffered data if the server crashes before a flush:
   Any search increments currently buffered in memory will be permanently lost if the Node.js process crashes or exits unexpectedly before `flush()` is executed. Given the buffer holds at most 10 seconds of writes or up to BATCH_SIZE unique queries, this results in a small, transient window of data loss that may slightly skew search volume analytics but keeps real-time performance extremely high.

2. Whether this system guarantees consistency:
   No, this introduces "Eventual Consistency". When bursts of searches occur, the `/suggest` and `/trending` endpoints will not reflect the exact real-time counts immediately until the next flush triggers. Additionally, the precise timestamps of the searches are generalized to the exact moment the flush occurs, rather than their precise ingestion times.

3. What you would do in production to mitigate data loss:
   In a production environment requiring high durability, we would stream search events directly into a highly available distributed queue or stream (e.g., Apache Kafka, Amazon Kinesis, Redis Streams). Alternatively, implementing a fast Write-Ahead Log (WAL) on disk before returning a 200 OK would guarantee durability, allowing unflushed data to be recovered and replayed upon restart. A dedicated background worker process would then pull from the stream/WAL to batch-update the database asynchronously.
*/

const BATCH_SIZE = process.env.BATCH_SIZE ? parseInt(process.env.BATCH_SIZE, 10) : 50;
const FLUSH_INTERVAL_MS = 10 * 1000;

class BatchWriter {
    constructor() {
        this.buffer = new Map(); // query -> incrementCount
        this.timer = null;
        
        this.metrics = {
            totalFlushes: 0,
            totalWritesReduced: 0,
            lastFlushAt: null
        };
    }

    enqueue(query) {
        const count = this.buffer.get(query) || 0;
        this.buffer.set(query, count + 1);

        if (this.buffer.size >= BATCH_SIZE) {
            this.flush();
        } else if (!this.timer) {
            this.timer = setTimeout(() => this.flush(), FLUSH_INTERVAL_MS);
        }
    }

    flush() {
        if (this.buffer.size === 0) return;
        
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        const start = Date.now();
        let totalIncrements = 0;
        const uniqueQueries = this.buffer.size;

        for (const [query, incrementAmount] of this.buffer.entries()) {
            totalIncrements += incrementAmount;
            
            let entry = getQueryDetails(query);
            let overallCount = (entry ? entry.count : 0) + incrementAmount;
            
            trendingTracker.setMaxOverallCount(overallCount);
            
            // Apply all timestamps in bulk
            const recentCount = trendingTracker.addSearch(query, incrementAmount);
            const newScore = trendingTracker.calculateScore(overallCount, recentCount);
            
            incrementQuery(query, newScore, incrementAmount);
            
            // Cache invalidation for short prefixes (1-3 chars)
            for (let i = 1; i <= Math.min(3, query.length); i++) {
                const prefix = query.substring(0, i);
                cacheLayer.invalidatePrefix(prefix);
            }
        }

        this.metrics.totalFlushes++;
        // Number of operations we avoided passing sequentially to the Trie / DB
        this.metrics.totalWritesReduced += (totalIncrements - uniqueQueries);
        this.metrics.lastFlushAt = new Date().toISOString();
        
        console.log(`BATCH FLUSH: flushed ${uniqueQueries} unique queries, ${totalIncrements} total increments, took ${Date.now() - start}ms`);
        
        this.buffer.clear();
    }

    getStats() {
        return {
            bufferSize: this.buffer.size,
            totalFlushes: this.metrics.totalFlushes,
            totalWritesReduced: this.metrics.totalWritesReduced,
            lastFlushAt: this.metrics.lastFlushAt
        };
    }
}

module.exports = new BatchWriter();
