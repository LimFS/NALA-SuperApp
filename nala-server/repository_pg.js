const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Initialize Schema
const initDB = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Users Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                first_name TEXT,
                last_name TEXT,
                email TEXT UNIQUE,
                password_hash TEXT,
                role TEXT DEFAULT 'student',
                profile_icon TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Refresh Tokens Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                token TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(user_id),
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Removed: Verification Codes (Optional/Later)

        // Seed Data
        const res = await client.query("SELECT COUNT(*) FROM users");
        if (parseInt(res.rows[0].count) === 0) {
            console.log("[NALA PG] Seeding Default Users...");
            const hash = await bcrypt.hash('password123', 10);
            const users = [
                ['uuid-del', 'Del', 'Spooner', 'student@nala.ai', hash, 'student', '/assets/profiles/del_durian.png'],
                ['uuid-hal', 'Hal', '9000', 'faculty@nala.ai', hash, 'faculty', '/assets/profiles/hal_9000.png']
            ];

            for (const u of users) {
                await client.query(
                    `INSERT INTO users (user_id, first_name, last_name, email, password_hash, role, profile_icon) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7)
                     ON CONFLICT (email) DO NOTHING`,
                    u
                );
            }
        }

        await client.query('COMMIT');
        console.log("[NALA PG] Schema Initialized.");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("[NALA PG] Init Failed:", e);
    } finally {
        client.release();
    }
};

// --- DATA METHODS ---

const findUserById = async (userId) => {
    const res = await pool.query("SELECT * FROM users WHERE user_id = $1", [userId]);
    return res.rows[0];
};

const findUserByEmail = async (email) => {
    const res = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    return res.rows[0];
};

const createUser = async (user) => {
    const { user_id, first_name, last_name, email, password_hash, role, profile_icon } = user;
    await pool.query(
        `INSERT INTO users (user_id, first_name, last_name, email, password_hash, role, profile_icon)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id) DO UPDATE SET
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            email = EXCLUDED.email,
            password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role`,
        [user_id, first_name, last_name, email, password_hash, role, profile_icon]
    );
    return user;
};

const saveRefreshToken = async (token, userId, expiresAt) => {
    await pool.query(
        "INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)",
        [token, userId, expiresAt]
    );
};

const findRefreshToken = async (token) => {
    const res = await pool.query("SELECT * FROM refresh_tokens WHERE token = $1", [token]);
    return res.rows[0];
};

const deleteRefreshToken = async (token) => {
    await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [token]);
};

const deleteUserRefreshTokens = async (userId) => {
    await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [userId]);
};

module.exports = {
    initDB,
    findUserById,
    findUserByEmail,
    createUser,
    saveRefreshToken,
    findRefreshToken,
    deleteRefreshToken,
    deleteUserRefreshTokens,
    pool
};
