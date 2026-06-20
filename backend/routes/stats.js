const express = require('express');
const { getStats } = require('../services/dataStore');
const batchWriter = require('../services/batchWriter');

const router = express.Router();

router.get('/', (req, res) => {
    const dataStoreStats = getStats();
    
    res.json({
        ...dataStoreStats,
        batchWriter: batchWriter.getStats()
    });
});

module.exports = router;
