const express = require('express');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- ROUTES ---

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'nala-user-service' });
});

// Setup/Seed Database (Dev Utility)
app.get('/setup', async (req, res) => {
    try {
        // Create Users Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                user_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Check if Default User Exists
        const check = await db.query("SELECT * FROM users WHERE email = $1", ['student@nala.ai']);
        if (check.rows.length === 0) {
            const hash = await bcrypt.hash('password123', 10);
            await db.query(
                "INSERT INTO users (first_name, last_name, email, password_hash) VALUES ($1, $2, $3, $4)",
                ['Del', 'Spooner', 'student@nala.ai', hash]
            );
            return res.json({ message: 'Database setup complete. Created Del Spooner.' });
        } else {
            // Force Update Name if exists (for demo purposes)
            await db.query(
                "UPDATE users SET first_name = $1, last_name = $2 WHERE email = $3",
                ['Del', 'Spooner', 'student@nala.ai']
            );
            return res.json({ message: 'Database user updated to Del Spooner.' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get Current User (Mock Auth: returns the first user found or hardcoded)
app.get('/user/me', async (req, res) => {
    try {
        // Try DB First
        const result = await db.query("SELECT user_id, first_name, last_name, email FROM users WHERE email = $1", ['student@nala.ai']);
        if (result.rows.length > 0) {
            return res.json(result.rows[0]);
        }
    } catch (err) {
        console.warn("DB Connection failed, falling back to Mock User for Demo:", err.message);
    }

    // Fail-safe Fallback (if DB down or empty)
    res.json({
        user_id: 'mock-uuid-1234',
        first_name: 'Del',
        last_name: 'Spooner',
        email: 'student@nala.ai'
    });
});

app.listen(PORT, () => {
    console.log(`[UserId Service] Running on Port ${PORT}`);
});
