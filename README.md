# Video Game Search Typeahead System

A high-performance, real-time autocomplete and trending system designed to emulate global platform search bars (like Steam or Epic Games).

## 1. How to run locally

From the root project directory, execute:
```bash
# Terminal 1: Backend
cd backend
npm install
node index.js

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

## 2. Dataset Source & Loading
The system is seeded by a generated CSV containing over 100,000 realistic video game queries. We utilized a Node.js generation script taking 500 base games and mutating them with common gamer suffixes (e.g., "elden ring splitscreen", "dota 2 speedrun"). 

Counts were scaled across a realistic Pareto distribution where mega-hits possess counts in the millions while niche long-tail titles hover in the hundreds. The data is loaded asynchronously at server boot `initDataStore()` using `fs.createReadStream()` to prevent blocking the main thread.

## 3. Architecture Overview
**Data flow for `/suggest` (Read Path):**
1. User types in the UI -> debounced by 300ms.
2. Request hits the Express API `GET /suggest`.
3. The query prefix runs through a **Consistent Hashing Ring** which deterministic routes it to one of our logical **Cache Nodes**.
4. If it's a Cache Hit -> Return instantly.
5. If Cache Miss -> Traverse the **In-Memory Trie**.
6. Each Trie Node natively holds a pre-sorted `top10` array of completions -> return instantly, save to cache.

**Data flow for `/search` (Write Path):**
1. User hits Enter, firing `POST /search`.
2. Request hits the **Batch Writer** which instantly responds `200 OK` and stores the `+1` increment in memory.
3. Every 10 seconds (or 50 unique keys), the batch buffer **flushes**.
4. The flush registers timestamps in the **Trending Tracker**, pulling the new `trendingScore` metric.
5. The flush performs atomic mass-increments directly onto the Trie, and automatically sends invalidation commands to the caching layer to delete the 1-3 character prefixes, ensuring the UI natively populates the newly trending scores immediately.

## 4. Design Decisions and Trade-offs

* **Why Trie vs. Sorted Array?**
  A sorted array is excellent for static lookups via binary search `O(log N)`. However, since our system must rank top results dynamically and ingest *live search traffic*, mutating and re-sorting a 100,000-item array continuously would thrash the CPU. A Trie grants `O(L)` prefix lookup, and by pre-caching the top 10 children directly on each parent node, we completely eliminated subtree scans.

* **Cache TTL Choice:**
  `60 seconds`. Anything higher prevents trending games from surging up the UI rapidly. Anything lower introduces unnecessary database hits for highly contentious prefixes (like "m" for Mario/Minecraft). We specifically combat stale caches via programmatic prefix invalidation during batch flushes.

* **Trending Score Formula:**
  `(overallCount / maxOverallCount) * 0.3 + (recentCount / maxRecentCount) * 0.7`. By normalizing both values against their maximums, we mathematically restrict the score between `0.0` and `1.0`. Weighting recent searches heavily at `0.7` prevents decade-old juggernauts from eternally suppressing viral new releases.

* **Batch Write Trade-offs (Eventual Consistency):**
  By deferring writes up to 10 seconds, we prevent lock-contention, but accept a 10s latency in real-time tracking, and open a small window for volatile memory loss if the Node process crashes before flushing.

## 5. Performance Results

We executed a rapid concurrency load test representing 100 users holding down the search key simultaneously for 10 seconds.
* Throughput: **3,385.20 Requests/sec**
* Error Rate: **0.00% (0 errors)**
* Latency p50: **28.13ms**
* Latency p95: **38.07ms**

Additionally, by adding a 4th node to our initial 3-node Consistent Hash ring cluster, we proved that we only needed to remap **25%** of cached keys, actively preventing cache stampedes. (See `perf-report.md` for raw outputs).

## 6. What we would do differently at 10x Scale

If the system needed to scale to millions of DAU:
1. **Decouple Architecture:** The Trie DataStore, BatchWriter, and Caches currently live in the same Node.js memory process. We would rip the cache out into dedicated Redis clusters, and rip the Trie out into a custom Go/Rust microservice or Apache Solr/ElasticSearch index.
2. **Kafka Ingest:** The Batch Writer would be replaced by streaming all `POST /search` hits natively into an Apache Kafka topic for high durability before parsing them into the database.
3. **Edge Caching:** `/suggest` API responses would be cached explicitly at the CDN level (Cloudflare / Fastly) by regions to offload 90% of reads from our servers entirely.

## 7. Running with Docker

docker-compose up --build
