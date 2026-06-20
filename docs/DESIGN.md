# System Design Document

This document outlines the architectural choices, algorithm designs, and trade-offs made while building the Search Typeahead System.

---

## 1. Data Structure Choice

**Selection:** In-Memory Trie (Prefix Tree).

**Why a Trie?**
A Trie allows for `O(L)` prefix lookup time, where `L` is the length of the prefix typed by the user. By pre-computing and caching the `top10` suggestions directly on each Trie node during initialization and batch-updates, we eliminate the need for recursive subtree traversals (DFS/BFS) on the critical read path. A read against the Trie is effectively an instantaneous lookup.

**Trade-offs vs. Sorted Array:**
While a flat Sorted Array consumes less memory and allows for fast binary-search lookups (`O(log N)`), it is highly inefficient for dynamic, write-heavy workloads. Whenever a new trending query is added or updated in a Sorted Array, it requires an `O(N)` slice/resort operation. The Trie sacrifices memory overhead (due to pointer allocation) for drastically superior read and write concurrency.

---

## 2. Caching Strategy

**Selection:** Prefix-level caching with a 60-second TTL.

**Why Prefix-Level?**
Typeahead systems suffer from heavy read-amplification because a single query ("elden") fires 5 discrete network requests ("e", "el", "eld", "elde", "elden"). By caching at the prefix level, the cache directly intercepts and absorbs these rapid, repetitive keystrokes before they hit the underlying data store.

**TTL and Staleness:**
The TTL is set to **60 seconds**.
* **What goes stale:** If a query suddenly goes viral within that 60-second window, the cached `top10` array for a given prefix will not instantly reflect the new ranking.
* **Mitigation:** The BatchWriter actively invalidates 1, 2, and 3-character caches when a flush alters the top 10 rankings, preventing the most contentious and widely-viewed root prefixes from remaining stale for the full 60 seconds.

### Redis Implementation
- 3 logical Redis DBs (db0/db1/db2) simulate 3 distributed nodes
- TTL is handled natively by Redis SETEX rather than manual timestamp checks
- Fallback to in-memory Maps if Redis is unavailable, ensuring the app never goes down due to cache failure
- In production, each DB would be a separate Redis instance or cluster shard

---

## 3. Consistent Hashing

To simulate a distributed architecture, we implemented a Consistent Hashing ring using the `crypto` MD5 algorithm.

**How it works:**
Cache nodes are hashed onto a circular keyspace. When a user requests a prefix (`/suggest?q=eld`), the string "eld" is hashed, and the system walks clockwise around the ring to find the nearest node to assign the cache to.

**Virtual Nodes:**
We allocate **100 virtual replicas** per physical node (e.g., `cache-node-1:45`). Standard consistent hashing can lead to uneven load distribution if nodes accidentally cluster together on the ring. Virtual nodes mathematically guarantee uniform traffic distribution across the cluster.

**Scaling (Adding/Removing Nodes):**
In a legacy modulus hash (`hash % N`), altering `N` (adding a server) remaps roughly ~75% of all cached keys, instantly triggering a catastrophic "cache stampede" to the database. By using Consistent Hashing, adding a new node only remaps `1/N` keys (the keys falling directly into the new partition), preserving cache warmth on the rest of the cluster.

---

## 4. Trending Score

We utilize a hybrid sliding-window formula to rank query results.

**The Formula:**
```javascript
trendingScore = (overallCount / maxOverallCount) * 0.3 + 
                (recentCount / maxRecentCount) * 0.7
```

**Why these weights?**
By normalizing both values against their maximums, the score stays locked between `0.0` and `1.0`. 
* The **30% historical weight** acts as an anchor. It ensures that legendary, universally recognized games (like "Minecraft") don't vanish completely from the top spots just because it's a slow Tuesday.
* The **70% recency weight** (calculated over a sliding 24-hour window) acts as the accelerator. This prevents a 10-year-old juggernaut with 5,000,000 total searches from permanently suppressing a brand-new release that garnered 50,000 searches today.

---

## 5. Batch Writes

**The Buffer Approach:**
Instead of locking the Trie and writing to it every time `POST /search` is called, the requests are intercepted by an in-memory `Map` buffer. The API instantly responds `200 OK` to the client.

**Flush Triggers:**
The buffer flushes to the Trie atomically when EITHER:
1. **50 unique queries** enter the buffer.
2. **10 seconds** elapse since the last flush.

**Failure Trade-offs (What is lost on a crash?):**
If the Node.js process crashes, any increments sitting in the buffer (maximum of 10 seconds of data) are permanently lost.
* **Why this is acceptable:** A search suggestion engine is not a financial ledger. Losing 10 seconds of search volume for a query will negligibly affect its trending score over a 24-hour window. The extreme performance gain of lock-free, zero-latency ingestion is well worth the minor durability trade-off.

---

## 6. What would change at 10x scale

If the system needed to scale to millions of Daily Active Users (DAU):

1. **Decouple the Data Store:** Storing a 100,000+ node Trie in the Node.js memory process becomes dangerous due to V8 Garbage Collection pauses. We would offload the indexing to an external cluster like Elasticsearch, Apache Solr, or a dedicated Rust/Go microservice.
2. **Message Queues:** The local in-memory BatchWriter would be replaced by streaming all `POST /search` hits natively into an **Apache Kafka** topic. This guarantees 100% durability and allows ingestion to scale independently from the aggregation workers.
3. **Dedicated Cache Clusters:** The Consistent Hash map would interface with a distributed **Redis** or Memcached cluster, rather than native JS objects, allowing cache memory to scale horizontally.
4. **Edge CDN Caching:** `/suggest` API responses would be explicitly cached at the CDN Edge (Cloudflare / Fastly) by geographical region to offload up to 90% of reads from our backend servers entirely.
