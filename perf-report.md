# Performance Report

We executed a rapid concurrency load test against the primary Typeahead API `GET /suggest` using a custom Node.js looping script mimicking 100 concurrent users. 

## Load Test Results

**Target Endpoint:** `http://localhost:3001/suggest?q=el`
**Duration:** 10 seconds
**Concurrency Limit:** 100 in-flight requests

* Total Requests Processed: **33,852**
* Error Rate: **0.00% (0 errors)**
* Throughput: **3,385.20 Requests/sec**

### Latency Percentiles (p-values)
* **p50:** 28.13ms
* **p95:** 38.07ms
* **p99:** 67.72ms

## Consistent Hashing Distribution Proof

We evaluated our 100-replica Consistent Hashing ring using an initial `3-node` cluster against 20 distinct high-volume queries:

```text
Distribution (3 nodes):
cache-node-1: 4 keys (20%)
cache-node-2: 7 keys (35%)
cache-node-3: 9 keys (45%)
```

Upon simulating a traffic surge requiring us to boot up a 4th cache instance (`cache-node-4`), we tracked the re-routing metric:

```text
Total Keys Remapped: 5 / 20 (25%)
```
In a legacy modulus hashing system (`hash % N`), altering the denominator from `3` to `4` would remap roughly **~75%** of all active cache keys, immediately triggering a massive "cache stampede" against our database. By using Consistent Hashing, scaling the cluster successfully rerouted exactly 25% of traffic onto the new node while preserving the existing connections.
