const express = require('express');
const batchWriter = require('../services/batchWriter');

const router = express.Router();

router.post('/', (req, res) => {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Invalid query' });
    }

    const lowerQuery = query.toLowerCase().trim();
    if (lowerQuery.length === 0) {
        return res.status(400).json({ error: 'Empty query' });
    }
    
    // Defer processing to the batch writer
    batchWriter.enqueue(lowerQuery);

    res.json({ message: 'Searched' });
});

module.exports = router;
