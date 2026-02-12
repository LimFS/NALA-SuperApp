import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());

// Status Check
app.get('/health', (req, res) => {
    res.json({ status: 'NALA Gateway Operational' });
});

// --- ERROR HANDLING ---
const proxyErrorHandler = (err, req, res, next) => {
    console.error(`[Gateway Proxy Error] ${req.originalUrl} -> ${err.message}`);
    if (!res.headersSent) {
        res.status(502).json({ error: "Service Unavailable", details: err.code });
    }
};

process.on('uncaughtException', (err) => console.error('[Gateway Critical] Uncaught:', err));
process.on('unhandledRejection', (reason) => console.error('[Gateway Critical] Unhandled Rejection:', reason));

// --- ROUTING TABLE ---

// 0. API Service (User Identity)
app.use('/api', createProxyMiddleware({
    target: 'http://127.0.0.1:3000',
    changeOrigin: true,
}));

// 1. Super App (Frontend) - MOVED TO BOTTOM
// app.use('/', ...);

// ATAS Agent (Calculus)
// ATAS Agent (Calculus)
// ATAS Agent (Calculus) - MH1810 Instance
// ATAS Agent (Calculus) - MH1810 Instance
// ATAS Agent (Calculus) - MH1810 Instance

app.use('/mh1810', createProxyMiddleware({
    target: 'http://127.0.0.1:3010',
    changeOrigin: true,
    pathRewrite: {
        '^/mh1810': '',
    },
    onError: proxyErrorHandler,
    logLevel: 'debug'
}));

// 3. CC0001 Agent (DesignThinker)
app.use('/design-thinker', createProxyMiddleware({
    target: 'http://127.0.0.1:3002',
    changeOrigin: true,
    pathRewrite: {
        '^/design-thinker': '',
    }
}));

// 4. IE2017 Agent (TeachableAgent)
app.use('/ie2017', createProxyMiddleware({
    target: 'http://127.0.0.1:3003',
    changeOrigin: true,
    pathRewrite: {
        '^/ie2017': '',
    }
}));

// 5. NED166 Agent (KnowledgeForum)
app.use('/ned166', createProxyMiddleware({
    target: 'http://127.0.0.1:3004',
    changeOrigin: true,
    pathRewrite: {
        '^/ned166': '',
    }
}));

// 6. EE2101 Agent (Migrated to ATAS)
// 6. EE2101 Agent (Restored AI Grader UI)
app.use('/ee2101', createProxyMiddleware({
    target: 'http://127.0.0.1:3001',
    changeOrigin: true,
    pathRewrite: {
        '^/ee2101': '',
    },
    // logLevel: 'debug' 
}));

// 7. Analytics Agent
app.use('/analytics', createProxyMiddleware({
    target: 'http://127.0.0.1:3006',
    changeOrigin: true,
    pathRewrite: {
        '^/analytics': '',
    }
}));

/* 
   Future Agents:
   app.use('/ie2017', createProxyMiddleware({ target: 'http://localhost:3003', ... }));
   app.use('/ned166', createProxyMiddleware({ target: 'http://localhost:3004', ... }));
   app.use('/ee2101', createProxyMiddleware({ target: 'http://localhost:3005', ... }));
   app.use('/analytics', createProxyMiddleware({ target: 'http://localhost:3006', ... }));
*/

// 1. Super App (Frontend) - Must be LAST (Catch-All)
app.use('/', createProxyMiddleware({
    target: 'http://127.0.0.1:5173',
    changeOrigin: true,
    ws: true, // Enable WebSocket for HMR
    logLevel: 'debug'
}));

app.listen(PORT, () => {
    console.log(`[NALA Gateway] Running on http://localhost:${PORT}`);
    console.log(`- Super App: http://localhost:${PORT}/`);
    console.log(`- ATAS:      http://localhost:${PORT}/mh1810`);
    console.log(`- CC0001:    http://localhost:${PORT}/design-thinker`);
});
