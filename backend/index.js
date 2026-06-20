const express = require('express');
const cors = require('cors');
const { initDataStore } = require('./services/dataStore');
const timingMiddleware = require('./middleware/timing');
const suggestRoute = require('./routes/suggest');
const searchRoute = require('./routes/search');
const statsRoute = require('./routes/stats');
const trendingRoute = require('./routes/trending');
const cacheRoute = require('./routes/cache');
const cacheLayer = require('./services/cache');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Performance measuring middleware
app.use(timingMiddleware);

// Response time measurement middleware
app.use((req, res, next) => {
    const start = process.hrtime();
    
    res.on('finish', () => {
        const diff = process.hrtime(start);
        const timeMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(3);
        console.log(`[${req.method}] ${req.originalUrl} - ${timeMs} ms`);
    });
    
    next();
});

// Routes
app.use('/suggest', suggestRoute);
app.use('/search', searchRoute);
app.use('/stats', statsRoute);
app.use('/trending', trendingRoute);
app.use('/cache', cacheRoute);

// Initialize data and start server
async function startServer() {
    try {
        await initDataStore();
        cacheLayer.startMetricsLogger();
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

startServer();
