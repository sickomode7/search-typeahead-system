const express = require('express');
const { getSuggestions } = require('../services/dataStore');
const consistentHash = require('../services/consistentHash');
const cacheLayer = require('../services/cache');

const router = express.Router();

router.get('/', (req, res) => {
    const prefix = req.query.q;
    
    if (!prefix || typeof prefix !== 'string' || prefix.trim() === '') {
        return res.json({ suggestions: [] });
    }
    
    const lowerPrefix = prefix.trim().toLowerCase();
    
    // 1. Determine Cache Node
    const targetNode = consistentHash.getNode(lowerPrefix);
    
    // 2. Check Cache
    let suggestions = cacheLayer.getCached(targetNode, lowerPrefix);
    
    // 3. If miss, fetch from dataStore and cache it
    if (suggestions) {
        res.setHeader('X-Cache', 'HIT');
    } else {
        res.setHeader('X-Cache', 'MISS');
        suggestions = getSuggestions(lowerPrefix);
        cacheLayer.setCached(targetNode, lowerPrefix, suggestions);
    }
    
    res.json({ suggestions });
});

module.exports = router;
