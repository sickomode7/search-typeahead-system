const fs = require('fs');
const readline = require('readline');
const trendingTracker = require('./trendingTracker');

class TrieNode {
    constructor() {
        this.children = new Map();
        this.isEndOfWord = false;
        // Cache top 10 completions at each node
        this.top10 = []; 
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode();
        this.queryCounts = new Map(); // exact counts: Map(query => { count, trendingScore })
    }

    _updateTop10(node, query, count, trendingScore) {
        const existingIndex = node.top10.findIndex(item => item.query === query);
        
        if (existingIndex !== -1) {
            node.top10[existingIndex].count = count;
            node.top10[existingIndex].trendingScore = trendingScore;
        } else {
            node.top10.push({ query, count, trendingScore });
        }
        
        // Sort by trendingScore descending, fallback to count descending
        node.top10.sort((a, b) => b.trendingScore - a.trendingScore || b.count - a.count);
        
        if (node.top10.length > 10) {
            node.top10.pop(); // Remove 11th item
        }
    }

    insert(query, count, trendingScore) {
        let node = this.root;
        this._updateTop10(node, query, count, trendingScore);
        
        for (const char of query) {
            if (!node.children.has(char)) {
                node.children.set(char, new TrieNode());
            }
            node = node.children.get(char);
            this._updateTop10(node, query, count, trendingScore);
        }
        node.isEndOfWord = true;
    }

    incrementQuery(query, newTrendingScore, incrementAmount = 1) {
        let entry = this.queryCounts.get(query);
        if (entry) {
            entry.count += incrementAmount;
            entry.trendingScore = newTrendingScore || entry.trendingScore;
        } else {
            entry = { count: incrementAmount, trendingScore: newTrendingScore || 0 };
            this.queryCounts.set(query, entry);
        }
        
        const currentCount = entry.count;
        const currentScore = entry.trendingScore;

        let node = this.root;
        this._updateTop10(node, query, currentCount, currentScore);
        
        for (const char of query) {
            if (!node.children.has(char)) {
                node.children.set(char, new TrieNode());
            }
            node = node.children.get(char);
            this._updateTop10(node, query, currentCount, currentScore);
        }
        node.isEndOfWord = true;
    }
    
    updateQueryScore(query, newTrendingScore) {
        let entry = this.queryCounts.get(query);
        if (!entry) return;
        
        entry.trendingScore = newTrendingScore;
        const currentCount = entry.count;

        let node = this.root;
        this._updateTop10(node, query, currentCount, newTrendingScore);
        
        for (const char of query) {
            if (!node.children.has(char)) {
                break;
            }
            node = node.children.get(char);
            this._updateTop10(node, query, currentCount, newTrendingScore);
        }
    }

    getSuggestions(prefix) {
        let node = this.root;
        for (const char of prefix) {
            if (!node.children.has(char)) {
                return [];
            }
            node = node.children.get(char);
        }
        // Exclude trendingScore to not break backwards compatibility
        return node.top10.map(item => ({ query: item.query, count: item.count }));
    }

    getTrending() {
        return this.root.top10;
    }
}

const dataStore = new Trie();

async function initDataStore() {
    const fileStream = fs.createReadStream('./data/queries.csv');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    console.log('Loading data from ./data/queries.csv...');
    let isFirstLine = true;
    const rawData = [];
    let maxCount = 0;

    for await (const line of rl) {
        if (isFirstLine) {
            isFirstLine = false;
            continue;
        }
        const [query, countStr] = line.split(',');
        if (query && countStr) {
            const count = parseInt(countStr, 10);
            if (count > maxCount) maxCount = count;
            rawData.push({ query, count });
        }
    }
    
    trendingTracker.setMaxOverallCount(maxCount);

    for (const item of rawData) {
        const score = trendingTracker.calculateScore(item.count, 0);
        dataStore.queryCounts.set(item.query, { count: item.count, trendingScore: score });
        dataStore.insert(item.query, item.count, score);
    }
    
    console.log('Data loaded into memory (Trie).');
    
    trendingTracker.startPruner((changedQueries) => {
        for (const q of changedQueries) {
            const entry = dataStore.queryCounts.get(q);
            if (entry) {
                const recentCount = trendingTracker.getRecentCount(q);
                const score = trendingTracker.calculateScore(entry.count, recentCount);
                dataStore.updateQueryScore(q, score);
            }
        }
    });
}

function getSuggestions(prefix) {
    return dataStore.getSuggestions(prefix);
}

function incrementQuery(query, newScore, incrementAmount = 1) {
    dataStore.incrementQuery(query, newScore, incrementAmount);
}

function getStats() {
    return {
        totalQueries: dataStore.queryCounts.size,
        totalSearchSubmissions: Array.from(dataStore.queryCounts.values()).reduce((sum, item) => sum + item.count, 0)
    };
}

function getTrending() {
    return dataStore.getTrending();
}

function getQueryDetails(query) {
    return dataStore.queryCounts.get(query);
}

module.exports = {
    initDataStore,
    getSuggestions,
    incrementQuery,
    getStats,
    getTrending,
    getQueryDetails
};
