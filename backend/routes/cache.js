const express = require('express');
const cacheLayer = require('../services/cache');

const router = express.Router();

router.get('/debug', async (req, res) => {
    const prefix = req.query.prefix;
    if (!prefix || typeof prefix !== 'string') {
        return res.status(400).json({ error: 'Missing prefix query parameter' });
    }
    
    const lowerPrefix = prefix.trim().toLowerCase();
    const debugInfo = await cacheLayer.getDebugInfo(lowerPrefix);
    res.json(debugInfo);
});

router.get('/stats', async (req, res) => {
    res.json(await cacheLayer.getStats());
});

module.exports = router;
