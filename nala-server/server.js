const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'nala-super-secret-key-2026';

// --- REPOSITORY (Postgres) ---
const repository = require('./repository_pg');

// Init DB (Schema + Seed)
repository.initDB();

app.use(cors());
app.use(express.json());

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error("[Auth] Token Verify Error:", err.message);
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};

// --- ROUTES ---

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'nala-user-service', db: 'postgres' });
});

// Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await repository.findUserByEmail(email);

        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (match) {
            const token = jwt.sign({ id: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
            res.json({
                token,
                user: {
                    user_id: user.user_id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    role: user.role,
                    profile_icon: user.profile_icon
                }
            });
        } else {
            res.status(401).json({ error: "Invalid credentials" });
        }
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: "DB Error" });
    }
});

// --- SHARED SECRET (Must match Agent) ---
const SHARED_SECRET = crypto.scryptSync('nala-agent-shared-secret-2025', 'salt', 32);
const IV_LENGTH = 16;

const encryptToken = (text) => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', SHARED_SECRET, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
};

// Issue Handover Token (For jumping to Agent)
// Issue Handover Token (For jumping to Agent)
app.post('/api/auth/issue-token', authenticateToken, async (req, res) => {
    // We create a short-lived token that the Agent can decrypt
    try {
        // 1. Fetch Full User Details (Email is critical for ATAS identity match)
        const user = await repository.findUserById(req.user.id);

        if (!user) return res.status(404).json({ error: "User not found" });

        // 2. Construct Payload with Email and Name
        const payload = JSON.stringify({
            userId: user.user_id,
            email: user.email,          // REQUIRED for ATAS
            name: user.first_name,      // REQUIRED for Greeting
            role: user.role,
            timestamp: Date.now()
        });

        const handoverToken = encryptToken(payload);
        res.json({ token: handoverToken }); // Match Frontend Expectation
    } catch (err) {
        console.error("Token Issue Error:", err);
        res.status(500).json({ error: "Encryption failed" });
    }
});

app.listen(PORT, () => {
    console.log(`[UserId Service] Running on Port ${PORT} (NALA DB / Postgres)`);
});

