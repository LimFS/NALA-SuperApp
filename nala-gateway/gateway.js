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

// --- ROUTING TABLE ---

// 0. API Service (User Identity)
app.use('/api', createProxyMiddleware({
    target: 'http://127.0.0.1:3000',
    changeOrigin: true,
}));

// 1. Super App (Frontend) - MOVED TO BOTTOM
// app.use('/', ...);

// 2. ATAS Agent (MH1810)
/* app.use('/atas', createProxyMiddleware({
    target: 'http://127.0.0.1:3001',
    changeOrigin: true,
    pathRewrite: {
        '^/atas': '', // Remove /atas prefix when forwarding
    }
})); */
// ATAS Agent (Calculus)
app.use('/atas', createProxyMiddleware({
    target: 'http://127.0.0.1:3001',
    changeOrigin: true,
    pathRewrite: {
        '^/atas': '',
    }
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

// 6. EE2101 Agent (AIGrader)
app.use('/ee2101', createProxyMiddleware({
    target: 'http://127.0.0.1:3005',
    changeOrigin: true,
    logLevel: 'debug'
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[NALA Gateway] Running on http://localhost:${PORT}`);
    console.log(`- Super App: http://localhost:${PORT}/`);
    console.log(`- ATAS:      http://localhost:${PORT}/atas`);
    console.log(`- CC0001:    http://localhost:${PORT}/design-thinker`);
});
