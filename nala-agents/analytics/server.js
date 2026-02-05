import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    ListToolsRequestSchema,
    CallToolRequestSchema,
    ListResourcesRequestSchema,
    ReadResourceRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// --- CONFIG ---
const HTTP_PORT = process.env.PORT || 3006;
const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'analytics.db');

// --- DATABASE SETUP ---
const db = new sqlite3.Database(DB_PATH);
db.serialize(() => {
    // Analytics DB tracks aggregated stats, not just questions
    db.run(`CREATE TABLE IF NOT EXISTS system_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        metric_name TEXT,
        value REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Seed some dummy stats
    db.get("SELECT count(*) as count FROM system_stats", (err, row) => {
        if (row && row.count === 0) {
            console.log("Seeding Analytics Data...");
            const stmt = db.prepare("INSERT INTO system_stats (metric_name, value) VALUES (?, ?)");
            stmt.run("active_users", 42);
            stmt.run("total_sessions", 156);
            stmt.run("avg_engagement", 8.5);
            stmt.finalize();
        }
    });
});

// --- EXPRESS SERVER ---
const app = express();
app.use(cors());
app.use(express.json());

// API Endpoints
app.get('/api/stats', (req, res) => {
    db.all("SELECT * FROM system_stats ORDER BY timestamp DESC LIMIT 10", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Config Endpoint
app.get('/api/config/ANALYTICS', (req, res) => {
    res.json({ found: true, mode: 'dashboard', activeModel: 'gemini-1.5-pro' });
});

// Serve UI
app.use(express.static(join(__dirname, 'dist')));

app.listen(HTTP_PORT, () => {
    console.error(`[Analytics] HTTP Server running on port ${HTTP_PORT}`);
});

// --- MCP SERVER (Low-Level Implementation) ---
const server = new Server(
    { name: "analytics-agent", version: "1.0.0" },
    {
        capabilities: {
            tools: {},
            resources: {}
        }
    }
);

// 1. List Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "get_system_health",
                description: "Get current system health metrics.",
                inputSchema: {
                    type: "object",
                    properties: {},
                    required: []
                }
            }
        ]
    };
});

// 2. Call Tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "get_system_health") {
        return {
            content: [{ type: "text", text: JSON.stringify({ status: "healthy", uptime: process.uptime() }) }]
        };
    }
    throw new Error("Tool not found");
});

// 3. List Resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
        resources: [
            {
                uri: "atas://ui/url",
                name: "Agent UI URL",
                mimeType: "text/plain"
            }
        ]
    };
});

// 4. Read Resource
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (request.params.uri === "atas://ui/url") {
        return {
            contents: [{
                uri: "atas://ui/url",
                mimeType: "text/plain",
                text: `http://localhost:${HTTP_PORT}`
            }]
        };
    }
    throw new Error("Resource not found");
});

// Start MCP
const transport = new StdioServerTransport();
server.connect(transport).catch(err => {
    console.error("MCP Connection Error:", err);
});
