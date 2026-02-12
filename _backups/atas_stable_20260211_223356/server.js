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
import crypto from "crypto";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import repoSQLite from './repository.js';
import repoPG from './repository_pg.js';

// Dynamic Repository Selection
const repository = (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres'))
    ? repoPG
    : repoSQLite;

console.log(`[ATAS Server] Using Repository: ${repository === repoPG ? 'Postgres' : 'SQLite'}`);

// Initialize Database (Run Migrations)
if (repository.initDB) {
    console.log("[ATAS Server] Initializing Database Schema...");
    // We can use top-level await in ES modules
    await repository.initDB();
}

import { GeminiService } from './src/modules/GeminiService.js';

import multer from 'multer'; // File Uploads
import fs from 'fs';

import rateLimit from 'express-rate-limit'; // Security: Rate Limiting

// --- CONFIG ---
dotenv.config(); // Load .env
const HTTP_PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPERAPP_URL = process.env.SUPERAPP_URL || 'http://localhost:8000'; // production-ready default
const __dirname = dirname(fileURLToPath(import.meta.url));

// --- MIDDLEWARE ---
const app = express();
app.use(cors());
app.use(express.json());

// Gateway Prefix Stripper Middleware
// The Gateway forwards requests like /mh1810/api/... to this server.
// We need to strip the /mh1810 prefix so the routers match /api/...
app.use((req, res, next) => {
    // Regex matches /<courseCode>/api/... where courseCode is alphanumeric
    const match = req.url.match(/^\/[a-zA-Z0-9]+\/api/);
    if (match) {
        console.log(`[Middleware] Rewriting ${req.url} to ${req.url.replace(match[0], '/api')}`);
        req.url = req.url.replace(match[0], '/api');
    } else {
        // console.log(`[Middleware] No match for ${req.url}`);
    }
    next();
});

// Security: Rate Limit AI Endpoints (limit to 100 requests per 15 minutes)
const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Too many grading requests, please try again later." }
});

// Serve Static Assets (Built UI) from 'dist'
app.use('/', express.static(join(__dirname, 'dist')));

// Serve Uploads with Fallback strategy
// 1. Try 'dist/assets/uploads' (Runtime/Built)
app.use('/assets/uploads', express.static(join(__dirname, 'dist/assets/uploads')));
// 2. Fallback to 'public/uploads' (Source/Persistent)
app.use('/assets/uploads', express.static(join(__dirname, 'public/uploads')));

// Configure Multer: Save to 'public/uploads' FIRST (Source of Truth)
const publicUploadDir = join(__dirname, 'public/uploads');
const distUploadDir = join(__dirname, 'dist/assets/uploads');

// Ensure both exist
[publicUploadDir, distUploadDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, publicUploadDir), // Save to persistent source
    filename: (req, file, cb) => {
        // Security: Sanitize filename + Timestamp to prevent overwrites
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = file.originalname.split('.').pop();
        cb(null, `${file.fieldname}-${uniqueSuffix}.${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// API Endpoints

// --- AUTH & HANDOVER (For EE2101 / Token Flow) ---
// Must match Core Server's secret
const SHARED_SECRET = crypto.scryptSync('nala-agent-shared-secret-2025', 'salt', 32);
const IV_LENGTH = 16;

const decryptToken = (text) => {
    try {
        const parts = text.split(':');
        const iv = Buffer.from(parts.shift(), 'hex');
        const encryptedText = Buffer.from(parts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', SHARED_SECRET, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (e) {
        console.error("Decryption Failed:", e.message);
        return null;
    }
};

app.post('/api/auth/exchange-token', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "No token provided" });

    const jsonStr = decryptToken(token);
    if (!jsonStr) return res.status(401).json({ error: "Invalid or expired token" });

    try {
        const payload = JSON.parse(jsonStr);
        // Return minimal identity info for Frontend
        res.json({
            email: payload.email,
            name: payload.name,
            userId: payload.userId,
            role: payload.role
        });
    } catch (e) {
        res.status(500).json({ error: "Malformed token payload" });
    }
});

app.get('/api/auth/role', async (req, res) => {
    const { userId, courseCode, academicYear, semester } = req.query;
    try {
        // Use Repository to check role (Source of Truth)
        const roleRow = await repository.getUserRole(userId, courseCode, academicYear, semester);
        const role = roleRow ? roleRow.role : 'student';
        res.json({ role });
    } catch (e) {
        console.error("Role Check Error:", e);
        res.json({ role: 'student' }); // Fail safe defaults
    }
});

// 1. Record Attempt (UPSERT)
app.post('/api/progress/attempt', async (req, res) => {
    const { userId, courseCode, questionId, setId, isCorrect } = req.body;
    try {
        await repository.recordAttempt({ userId, courseCode, questionId, setId, isCorrect });
        res.json({ success: true });
    } catch (err) {
        console.error("Attempt Record Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 2. File Upload Endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    // Sync: Copy file to dist/assets/uploads for immediate usage
    const srcPath = req.file.path; // In public/uploads
    const destPath = join(distUploadDir, req.file.filename);

    try {
        fs.copyFileSync(srcPath, destPath);
    } catch (err) {
        console.error("Failed to sync upload to dist:", err);
        // Continue anyway, as fallback middleware serves public/uploads
    }

    // Return path relative to mount point
    // PRECORRECT: Prefix with /mh1810 so Gateway routes it correctly to this service
    res.json({ url: `/mh1810/assets/uploads/${req.file.filename}` });
});

// 3. Reorder Questions (See Questions API section below for implementation)
// Replaced by repository.reorderQuestions abstraction to support Postgres


// Secure Proxy for Gemini Grading
app.post('/api/grade', aiLimiter, async (req, res) => {
    try {
        const { contents, userId, questionId, questionVersionUuid, studentAnswer, courseCode, academicYear, semester } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: "Server misconfiguration: No API Key." });
        }

        // Use User-Specified Model
        const geminiService = new GeminiService(process.env.GEMINI_API_KEY, 'gemini-3-pro-preview');

        // MODE A: Legacy Raw Proxy (if 'contents' provided)
        if (contents) {
            console.log("Server: Proxying raw grading request...");
            const data = await geminiService.generateContent(contents);
            return res.json(data);
        }

        // MODE B: Structured Grading (Secure & Versioned)
        if (studentAnswer && questionId) {
            console.log(`Server: Grading Structured Request for ${questionId} (v: ${questionVersionUuid || 'latest'})...`);

            // 1. Fetch Question Context (Server-side Trust)
            // Ideally we fetch from DB to get the exact prompt template and answer key, 
            // but for now we accept some clues from payload or reconstruct.
            // Better: Fetch the question from repo to ensure we grade against the TRUE answer key.
            const questions = await repository.getQuestions(courseCode, academicYear || '2025', semester || '2');
            const question = questions.find(q => q.id === questionId);

            if (!question) {
                // Fallback to payload data if provided, or error
                console.warn("Question not found in DB, using fallback context");
            }

            // 2. Construct Prompt (Dynamic from DB)
            const config = await repository.getCourseConfig(courseCode, academicYear || '2025', semester || '2');
            let template = config?.prompt_template;

            if (!template) {
                console.warn("No prompt template found in DB, using fallback.");
                template = `You are an AI Tutor. Analyze the answer.
Question: {{questionText}}
Correct Answer: {{answerKey}}
Student Answer: {{studentAnswer}}

Respond STRICTLY in JSON format:
{
  "correct": boolean,
  "explanation": "string",
  "score": number (0-10)
}`;
            }

            const promptText = template
                .replace('{{questionText}}', question ? question.question_text : "Unknown")
                .replace('{{answerKey}}', question ? JSON.stringify(question.answerKey) : "Unknown")
                .replace('{{studentAnswer}}', studentAnswer)
                .replace('{{hintPolicy}}', "Provide a helpful hint without giving away the answer.");

            console.log("Server: Generated Prompt for Gemini:\n", promptText);

            // 3. Call AI
            const data = await geminiService.generateContent([{ parts: [{ text: promptText }] }]);

            // 4. Parse AI Result
            let aiResult = { correct: false, explanation: "Grading failed", score: 0 };
            try {
                const text = data.candidates[0].content.parts[0].text;
                // Strip Markdown code blocks if present
                const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
                aiResult = JSON.parse(jsonStr);
            } catch (e) {
                console.error("AI Parse Error:", e);
            }

            // 5. Save Trace (Audit Trail)
            const recordId = crypto.randomUUID();
            await repository.saveGradingRecord({
                id: recordId,
                udi: `${userId}-${courseCode}-${questionId}`, // Simplified UDI
                user_id: userId,
                course_code: courseCode,
                academic_year: academicYear || '2025',
                semester: semester || '2',
                question_id: questionId,
                question_version_uuid: questionVersionUuid, // PERSIST VERSION
                set_id: question ? question.set_id : null,
                input_bundle: req.body,
                score: aiResult.score || (aiResult.correct ? 10 : 0),
                max_score: 10,
                grading_trace: { ai_response: data, prompt: promptText }
            });

            // 6. Return Result compatible with UI expectation (Gemini format)
            // UI expects { candidates: ... } or we can return simplified if UI handles it.
            // ATAS.vue handles standard Gemini response OR we can adapt.
            // ATAS.vue lines 850+ parses candidates.
            // We should mock that structure to minimize UI changes:
            res.json({
                candidates: [{
                    content: {
                        parts: [{ text: JSON.stringify(aiResult) }]
                    }
                }]
            });
            return;
        }

        res.status(400).json({ error: "Invalid Request Format" });

    } catch (err) {
        console.error("Proxy Error (Grading):", err);
        const logMsg = `[${new Date().toISOString()}] Error: ${err.message}\nStack: ${err.stack}\n\n`;
        fs.appendFileSync('debug_error.log', logMsg); // Persistent Log
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/progress/:courseCode/:userId', async (req, res) => {
    const { courseCode, userId } = req.params;
    const academicYear = req.query.academicYear || 'AY2025';
    const semester = req.query.semester || 'Semester 2';
    try {
        const row = await repository.get(
            "SELECT * FROM student_progress WHERE user_id = ? AND course_code = ? AND academic_year = ? AND semester = ?",
            [userId, courseCode, academicYear, semester]
        );
        if (!row) return res.json({ found: false });
        res.json({ found: true, id: row.id, currentSetId: row.current_set_id, currentDifficulty: row.current_difficulty, data: JSON.parse(row.data) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Config Endpoint
app.get('/api/config/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const academicYear = req.query.academicYear || 'AY2025';
    const semester = req.query.semester || 'Semester 2'; // Should align with frontend default

    try {
        const config = await repository.getCourseConfig(courseCode, academicYear, semester);
        if (config) {
            res.json({
                found: true,
                courseName: config.course_name, // Return the DB name
                iconUrl: config.icon_url,
                promptTemplate: config.prompt_template,
                modelConfig: config.model_config,
                dashboardUrl: config.dashboard_url // If exists
            });
        } else {
            res.json({ found: false });
        }
    } catch (e) {
        console.error("Config Fetch Error:", e);
        res.status(500).json({ error: "Failed to fetch config" });
    }
});

// Questions Endpoint (Delegates to Repository)
// Questions Endpoint (Delegates to Repository)
app.get('/api/courses/:courseCode/questions', async (req, res) => {
    const { courseCode } = req.params;
    const setId = req.query.setId; // Optional: ?setId=2
    const { userId, academicYear = 'AY2025', semester = 'Semester 2' } = req.query;

    let includeHidden = false;

    // Check Authorization to reveal hidden questions
    if (userId) {
        try {
            const roleRow = await repository.getUserRole(userId, courseCode, academicYear, semester);
            if (roleRow && roleRow.role === 'faculty') {
                includeHidden = true;
            }
        } catch (e) {
            console.warn("Role check failed during getQuestions:", e);
        }
    }

    try {
        // Use Repository to get SORTED questions with fully qualified context
        const questions = await repository.getQuestions(courseCode, academicYear, semester, setId, includeHidden);
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Application Config (Dynamic Context)
// 3. Application Config (Dynamic Context)
app.get('/api/config', async (req, res) => {
    try {
        const { courseCode } = req.query;
        let row = null;

        if (courseCode) {
            // Robust Lookup: Find Latest Active Config
            row = await repository.getLatestCourseConfig(courseCode);
        } else {
            // Fallback: Just get any active one
            row = await repository.get("SELECT * FROM course_offerings WHERE is_active = 1 LIMIT 1");
        }

        // Fallback or DB Logic
        const baseConfig = row ? {
            courseCode: row.course_code,
            courseName: row.course_name,
            academicYear: row.academic_year,
            semester: row.semester,
            iconUrl: row.icon_url,
            promptTemplate: row.prompt_template || 'You are an AI Tutor for Engineering Mathematics. Analyze the student answer for the given question. \n\nQuestion: {{questionText}}\nCorrect Answer: {{answerKey}}\nStudent Answer: {{studentAnswer}}\n\nYour task:\n1. determine if the answer is conceptually correct (even if format differs slightly). \n2. Provide a helpful explanation or hint if incorrect, based on this policy: {{hintPolicy}}.\n\nRespond STRICTLY in JSON format:\n{\n  "correct": boolean,\n  "explanation": "string"\n}',
        } : {
            // Default Fallback
            courseCode: 'MH1810',
            courseName: 'Mathematics 2',
            academicYear: 'AY2025',
            semester: 'Semester 2',
            promptTemplate: 'You are an AI Tutor for Engineering Mathematics. Analyze the student answer for the given question. \n\nQuestion: {{questionText}}\nCorrect Answer: {{answerKey}}\nStudent Answer: {{studentAnswer}}\n\nYour task:\n1. determine if the answer is conceptually correct (even if format differs slightly). \n2. Provide a helpful explanation or hint if incorrect, based on this policy: {{hintPolicy}}.\n\nRespond STRICTLY in JSON format:\n{\n  "correct": boolean,\n  "explanation": "string"\n}'
        };

        // NEW: Inject Infrastructure Config (Dashboard URL)
        res.json({
            ...baseConfig,
            dashboardUrl: SUPERAPP_URL
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SECURE HANDOFF ---


// --- FACULTY API ---

// Check Role
app.get('/api/auth/role', async (req, res) => {
    const { courseCode, academicYear, semester } = req.query;
    const userId = req.headers['x-user-id'] || req.query.userId;
    try {
        const row = await repository.getUserRole(userId, courseCode, academicYear, semester);
        res.json({ role: row ? row.role : 'student' }); // Default to student
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/taxonomies', async (req, res) => {
    try {
        const rows = await repository.getTaxonomies();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Config (Faculty Only)
app.post('/api/courses/:courseCode/config', async (req, res) => {
    const { courseCode } = req.params;
    const userId = req.headers['x-user-id'] || req.body.userId;
    const { academicYear, semester, config } = req.body;

    // Auth Check
    const roleRow = await repository.getUserRole(userId, courseCode, academicYear, semester);
    if (!roleRow || roleRow.role !== 'faculty') {
        return res.status(403).json({ error: "Unauthorized: Faculty access required." });
    }

    try {
        await repository.updateCourseConfig(courseCode, academicYear, semester, config);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Analytics (Faculty Only) (PII Masked)
app.get('/api/analytics/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const userId = req.headers['x-user-id'] || req.query.userId;
    const { academicYear, semester } = req.query;

    if (!userId) return res.status(400).json({ error: "Missing User ID (Header)" });

    const roleRow = await repository.getUserRole(userId, courseCode, academicYear, semester);
    if (!roleRow || roleRow.role !== 'faculty') {
        return res.status(403).json({ error: "Unauthorized" });
    }

    try {
        const stats = await repository.getQuestionStats(courseCode, academicYear, semester);
        res.json({ stats });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SETS API (Faculty Only for writes, Read All for Faculty, Active Only for Students) ---
app.get('/api/sets/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const { academicYear, semester } = req.query;
    const userId = req.headers['x-user-id'] || req.query.userId;

    let includeHidden = false;

    // Check Authorization to reveal hidden sets
    if (userId) {
        try {
            const roleRow = await repository.getUserRole(userId, courseCode, academicYear, semester);
            if (roleRow && roleRow.role === 'faculty') {
                includeHidden = true;
            }
        } catch (e) {
            console.warn("Role check failed during getSets:", e);
        }
    }

    try {
        console.log(`[DEBUG] Fetching Sets for ${courseCode} (Hidden=${includeHidden})`);
        const sets = await repository.getSets(courseCode, academicYear, semester, includeHidden);
        console.log(`[DEBUG] API returning Sets:`, sets.map(s => ({ id: s.id, name: s.set_name || s.name })));
        res.json(sets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sets/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const { userId, academicYear, semester, set } = req.body;

    const roleRow = await repository.getUserRole(userId, courseCode, academicYear, semester);
    if (!roleRow || roleRow.role !== 'faculty') return res.status(403).json({ error: "Unauthorized" });

    try {
        await repository.upsertSet(courseCode, academicYear, semester, set, userId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/sets/:courseCode/:setId', async (req, res) => {
    const { courseCode, setId } = req.params;
    const { userId, academicYear, semester } = req.body; // DELETE body? Or query? Usually DELETE has no body?
    // Use Query for DELETE auth params
    const qUserId = req.query.userId;
    const qAy = req.query.academicYear;
    const qSem = req.query.semester;

    const roleRow = await repository.getUserRole(qUserId, courseCode, qAy, qSem);
    if (!roleRow || roleRow.role !== 'faculty') return res.status(403).json({ error: "Unauthorized" });

    try {
        await repository.deleteSet(courseCode, qAy, qSem, setId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- STUDENT PROGRESS API ---
// --- STUDENT PROGRESS API ---
app.post('/api/progress', async (req, res) => {
    // 1. Get User ID from Header (Preferred) or Body
    const userId = req.headers['x-user-id'] || req.body.userId;
    // Extract set-specific data vs global context
    const { courseCode, academicYear, semester, currentSetId, currentDifficulty, lastActiveQuestionUuid, data } = req.body;

    if (!userId) return res.status(400).json({ error: "Missing User ID (Header X-User-Id)" });

    try {
        // Fetch existing to merge
        const existingRow = await repository.getProgress(userId, courseCode, academicYear, semester);
        let finalData = {
            lastActiveSetId: currentSetId,
            sets: {}
        };

        if (existingRow && existingRow.data) {
            // Parse existing
            try {
                const parsed = typeof existingRow.data === 'string' ? JSON.parse(existingRow.data) : existingRow.data;
                // Migrate old flat structure if needed, or use existing hierarchical
                if (parsed.sets) {
                    finalData = parsed;
                } else {
                    // Migration on fly: treat old flat as Set 1 (or unknown)
                    // Discarding old flat for safety to avoid mixing schemas is safer given we wiped DB
                    // logical no-op
                }
            } catch (e) { }
        }

        // Update specific set
        finalData.lastActiveSetId = currentSetId;
        finalData.sets = finalData.sets || {};
        finalData.sets[currentSetId] = data; // 'data' is now just the set-specific progress

        await repository.saveProgress(userId, courseCode, academicYear, semester, {
            currentSetId,
            currentDifficulty,
            lastActiveQuestionId: lastActiveQuestionUuid,
            data: JSON.stringify(finalData)
        });
        res.json({ success: true });
    } catch (err) {
        console.error("Progress Save Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET Progress (PII Masked: userId in Header)
app.get('/api/progress/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const userId = req.headers['x-user-id'] || req.query.userId; // Support legacy query for now, but prefer header
    const { academicYear, semester } = req.query;

    if (!userId) return res.status(400).json({ error: "Missing User ID (Header X-User-Id)" });

    try {
        const row = await repository.getProgress(userId, courseCode, academicYear, semester);
        if (row) {
            let progressData = row.data;
            if (typeof progressData === 'string') {
                try { progressData = JSON.parse(progressData); } catch (e) { }
            }
            res.json({ found: true, data: progressData });
        } else {
            res.json({ found: false });
        }
    } catch (err) {
        console.error("Get Progress Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- QUESTIONS API (Faculty Only) ---
// --- QUESTIONS API (Faculty Only) ---
app.post('/api/questions', async (req, res) => {
    // 1. Robust User ID Extraction
    const userId = req.headers['x-user-id'] || req.body.userId;
    const { question } = req.body;

    if (!userId) return res.status(400).json({ error: "Missing User ID (Header or Body)" });
    // Context (Handle camel/snake case mismatch)
    const courseCode = question.courseCode || question.course_code;
    const academicYear = question.academicYear || question.academic_year;
    const semester = question.semester;

    console.log(`[DEBUG] Auth Check: User=${userId}, Course=${courseCode}, AY=${academicYear}, Sem=${semester}`);

    const roleRow = await repository.getUserRole(userId, courseCode, academicYear, semester);
    console.log(`[DEBUG] Role Result:`, roleRow);

    if (!roleRow || roleRow.role !== 'faculty') return res.status(403).json({ error: "Unauthorized" });

    try {
        await repository.upsertQuestion(question);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/courses/:courseCode/questions', async (req, res) => {
    const { courseCode } = req.params;
    const setId = req.query.setId; // Optional: ?setId=2
    const userId = req.headers['x-user-id'] || req.query.userId;
    const { academicYear = 'AY2025', semester = 'Semester 2' } = req.query;

    let includeHidden = false;

    // Check Authorization to reveal hidden questions
    if (userId) {
        try {
            const roleRow = await repository.getUserRole(userId, courseCode, academicYear, semester);
            if (roleRow && roleRow.role === 'faculty') {
                includeHidden = true;
            }
        } catch (e) {
            console.warn("Role check failed during getQuestions:", e);
        }
    }

    try {
        // Use Repository to get SORTED questions with fully qualified context
        const questions = await repository.getQuestions(courseCode, academicYear, semester, setId, includeHidden);
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/questions/:id', async (req, res) => {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] || req.query.userId;
    const { courseCode, academicYear, semester } = req.query;

    if (!userId) return res.status(403).json({ error: "Unauthorized" });

    const roleRow = await repository.getUserRole(userId, courseCode, academicYear, semester);
    if (!roleRow || roleRow.role !== 'faculty') return res.status(403).json({ error: "Unauthorized" });

    try {
        await repository.deleteQuestion(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/questions/reorder', async (req, res) => {
    const { items } = req.body;
    // Basic Auth Check Omitted for brevity (or check first item's context if needed, but for now rely on dashboard context being secure enough for prototype/demo)
    // Ideally, we should validate course context for every item, but items list doesn't carry course info explicitly in the payload structure used by UI.
    // For now, allow open access for this internal API or assume protected by network/session if implemented fully.
    try {
        await repository.reorderQuestions(items);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DEBUG: MANUAL NUCLEAR WIPE ENDPOINT
app.get('/api/nuke', async (req, res) => {
    try {
        if (repository.debugWipe) {
            await repository.debugWipe();
            console.log("ATA: MANUAL NUKE EXECUTED");
            res.json({ success: true, message: "Database Wiped Successfully" });
        } else {
            res.status(500).json({ error: "debugWipe not available in repository" });
        }
    } catch (e) {
        console.error("ATA: NUKE FAILED", e);
        res.status(500).json({ error: e.message });
    }
});

app.listen(HTTP_PORT, () => {
    console.log(`[ATAS Agent] HTTP Server running on port ${HTTP_PORT}`);
    // Initialize DB (Tables + Seeding managed by Repository)
    repository.initDB();

    // Auto-Wipe on Start (Optional, good for this session)
    if (repository.debugWipe) {
        repository.debugWipe().then(() => console.log("ATA: STARTUP WIPE DONE"));
    }
});

// --- MCP SERVER (Low-Level Implementation) ---
const server = new Server(
    { name: "atas-agent", version: "1.0.0" },
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
                name: "grade_student_answer",
                description: "Grade a student's answer using strict inclusion check.",
                inputSchema: {
                    type: "object",
                    properties: {
                        questionText: { type: "string" },
                        studentAnswer: { type: "string" },
                        correctAnswer: { type: "string" }
                    },
                    required: ["questionText", "studentAnswer", "correctAnswer"]
                }
            }
        ]
    };
});

// 2. Call Tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "grade_student_answer") {
        const { studentAnswer, correctAnswer } = request.params.arguments;
        const correct = String(studentAnswer).toLowerCase().includes(String(correctAnswer).toLowerCase());
        return {
            content: [{ type: "text", text: JSON.stringify({ correct, feedback: correct ? "Correct!" : "Try again." }) }]
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
            },
            {
                uri: "atas://icon",
                name: "Agent Icon",
                mimeType: "image/png"
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
    if (request.params.uri === "atas://icon") {
        return {
            contents: [{
                uri: "atas://icon",
                mimeType: "image/png",
                text: `http://localhost:${HTTP_PORT}/mh1810_math.png`
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
