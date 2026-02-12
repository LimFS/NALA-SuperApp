/**
 * Standardized Database Adapter
 * PRODUCTION MANIFESTO: Rule #1 (Wrapper-First)
 * Centralizes DB driver usage and enforces schema consistency.
 */

import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

class DBAdapter {
    constructor() {
        this.type = 'postgres';
        this.pool = new pg.Pool({
            connectionString: process.env.DATABASE_URL,
            max: 20, // Connection Pooling
            idleTimeoutMillis: 30000
        });
        console.log("[DB Adapter] Using Postgres (Production Mode)");
    }

    query(sql, params = []) {
        return this.pool.query(sql, params).then(res => res.rows); // PG returns rows in .rows
    }

    // Helper for single row
    get(sql, params = []) {
        return this.query(sql, params).then(rows => rows[0] || null);
    }
}

export const dbAdapter = new DBAdapter();
