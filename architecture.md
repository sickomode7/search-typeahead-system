# Architecture

```text
         [ Web Client ]
               │
               ▼
     [ Frontend (React/Vite) ]
               │
               ▼
 [ Node.js Express Backend API ]
               │
    ┌──────────┴──────────┐
    │     Consistent      │  <-- Hashing the prefix (e.g. "eld")
    │    Hashing Ring     │
    └────┬────┬────┬──────┘
         │    │    │
         ▼    ▼    ▼
     [ N1 ] [ N2 ] [ N3 ]  <-- In-Memory Caching Layer
         │    │    │           (TTL: 60s)
         └────┼────┘
      (Cache Miss / Write)
              │
              ▼
   [ Batch Writer Queue ]  <-- Defers & Aggregates POST /search
              │                (Flushes at N=50 or T=10s)
              ▼
   [ Root Trie Data Store ]
              │                --> Caches Top 10 completions per-node
              ▼
    [ Trending Tracker ]   <-- Updates global query scores based on
                               historical count + recent 24h velocity
```
