const express = require('express');
const { getTrending } = require('../services/dataStore');
const trendingTracker = require('../services/trendingTracker');

const router = express.Router();

router.get('/', (req, res) => {
    const rawTrending = getTrending();
    
    const trending = rawTrending.map(item => {
        const recentSearches = trendingTracker.getRecentCount(item.query);
        return {
            query: item.query,
            score: parseFloat(item.trendingScore.toFixed(4)),
            recentSearches: recentSearches,
            totalCount: item.count
        };
    });
    
    res.json({ trending });
});

module.exports = router;
