const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

class TrendingTracker {
    constructor() {
        this.searches = new Map(); // query -> [timestamps]
        this.maxOverallCount = 1; // Updated lazily
        this.maxRecentCount = 10; // Sensible minimum
    }

    setMaxOverallCount(max) {
        if (max > this.maxOverallCount) {
            this.maxOverallCount = max;
        }
    }

    addSearch(query, incrementAmount = 1) {
        if (!this.searches.has(query)) {
            this.searches.set(query, []);
        }
        const timestamps = this.searches.get(query);
        const now = Date.now();
        for (let i = 0; i < incrementAmount; i++) {
            timestamps.push(now);
        }
        
        if (timestamps.length > this.maxRecentCount) {
            this.maxRecentCount = timestamps.length;
        }
        
        return timestamps.length;
    }
    
    getRecentCount(query) {
        return this.searches.get(query)?.length || 0;
    }

    calculateScore(overallCount, recentCount) {
        const normalizedOverall = Math.min(overallCount / this.maxOverallCount, 1.0);
        const normalizedRecent = Math.min(recentCount / this.maxRecentCount, 1.0);
        
        // Trending Score Formula: 0.3 historical + 0.7 recent
        return (normalizedOverall * 0.3) + (normalizedRecent * 0.7);
    }

    prune() {
        const now = Date.now();
        const changedQueries = [];
        let newMaxRecent = 10;

        for (const [query, timestamps] of this.searches.entries()) {
            const initialCount = timestamps.length;
            
            // Keep only timestamps within last 24h
            const filtered = timestamps.filter(t => (now - t) <= TWENTY_FOUR_HOURS);
            
            if (filtered.length === 0) {
                this.searches.delete(query);
            } else {
                this.searches.set(query, filtered);
                if (filtered.length > newMaxRecent) {
                    newMaxRecent = filtered.length;
                }
            }
            
            if (filtered.length !== initialCount) {
                changedQueries.push(query);
            }
        }
        
        this.maxRecentCount = newMaxRecent;
        return changedQueries;
    }

    startPruner(updateCallback) {
        // Prune every 5 minutes
        setInterval(() => {
            const changed = this.prune();
            if (updateCallback && changed.length > 0) {
                updateCallback(changed);
            }
        }, 5 * 60 * 1000);
    }
}

module.exports = new TrendingTracker();
