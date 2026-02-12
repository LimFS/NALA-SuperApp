
/**
 * Standardized Database Adapter
 * PRODUCTION MANIFESTO: Rule #1 (Wrapper-First)
 * Centralizes DB driver usage and enforces schema consistency.
 */

import sqlite3 from 'sqlite3';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQLITE_PATH = join(__dirname, '../../ee2101.db');

class DBAdapter {
    constructor() {
        this.type = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost:5432/ai_grader") ? 'postgres' : 'sqlite';

        if (this.type === 'sqlite') {
            this.db = new sqlite3.Database(SQLITE_PATH);
            console.log("[DB Adapter] Using SQLite (Dev Mode)");
        } else {
            this.pool = new pg.Pool({
                connectionString: process.env.DATABASE_URL,
                max: 20, // Connection Pooling
                idleTimeoutMillis: 30000
            });
            console.log("[DB Adapter] Using Postgres (Production Mode)");
        }
    }

    query(sql, params = []) {
        if (this.type === 'sqlite') {
            return new Promise((resolve, reject) => {
                if (sql.trim().toUpperCase().startsWith('SELECT')) {
                    this.db.all(sql, params, (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                } else {
                    this.db.run(sql, params, function (err) {
                        if (err) reject(err);
                        else resolve({ lastID: this.lastID, changes: this.changes });
                    });
                }
            });
        } else {
            return this.pool.query(sql, params).then(res => res.rows); // PG returns rows in .rows
        }
    }

    // Helper for single row
    get(sql, params = []) {
        return this.query(sql, params).then(rows => rows[0] || null);
    }
}

export const dbAdapter = new DBAdapter();
