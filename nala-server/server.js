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
        await db.query(`DROP TABLE IF EXISTS users`); // Force Reset for Prototype Schema Changes
        await db.query(`
            CREATE TABLE users (
                user_id TEXT PRIMARY KEY,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                profile_icon VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Hardcoded Stable IDs for Prototype
        const users = [
            { id: 'uuid-del', first: 'Del', last: 'Spooner', email: 'student@nala.ai', role: 'student', icon: '/assets/profiles/del_durian.png' },
            { id: 'uuid-hal', first: 'Hal', last: '9000', email: 'faculty@nala.ai', role: 'faculty', icon: '/assets/profiles/hal_9000.png' }
        ];

        const hash = await bcrypt.hash('password123', 10);

        for (const u of users) {
            await db.query(`
                INSERT INTO users (user_id, first_name, last_name, email, password_hash, profile_icon)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (user_id) DO UPDATE SET first_name = $2, last_name = $3, profile_icon = $6
             `, [u.id, u.first, u.last, u.email, hash, u.icon]);
        }
        res.json({ message: 'Database seeded with Del (Durian Man) and Hal.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get Current User (Mock Auth: returns requested user or default)
app.get('/user/me', async (req, res) => {
    const requestedId = req.query.userId || 'uuid-del'; // Default to Del
    try {
        // Try DB First
        const result = await db.query("SELECT user_id, first_name, last_name, email, profile_icon FROM users WHERE user_id = $1", [requestedId]);
        if (result.rows.length > 0) {
            return res.json(result.rows[0]);
        }
    } catch (err) {
        console.warn("DB Connection failed, falling back to Mock User for Demo:", err.message);
    }

    // Fail-safe Fallback (Mock)
    if (requestedId === 'uuid-hal') {
        return res.json({ user_id: 'uuid-hal', first_name: 'Hal', last_name: '9000', email: 'faculty@nala.ai', profile_icon: '/assets/profiles/hal_9000.png' });
    }
    res.json({
        user_id: 'uuid-del',
        first_name: 'Del',
        last_name: 'Spooner',
        email: 'student@nala.ai',
        profile_icon: '/assets/profiles/del_durian.png'
    });
});

app.listen(PORT, () => {
    console.log(`[UserId Service] Running on Port ${PORT}`);
});
