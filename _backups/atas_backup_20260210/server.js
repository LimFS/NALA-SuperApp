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
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import repository from './repository.js'; // Import Repository Module
import { GeminiService } from './src/modules/GeminiService.js';

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

// Security: Rate Limit AI Endpoints (limit to 100 requests per 15 minutes)
const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Too many grading requests, please try again later." }
});

// Serve Static Assets (Built UI) from 'dist'
app.use('/', express.static(join(__dirname, 'dist')));

// API Endpoints

// 1. Record Attempt (UPSERT)
app.post('/api/progress/attempt', async (req, res) => {
    const { userId, courseCode, questionId, setId, isCorrect } = req.body;
    const sql = `
        INSERT INTO student_question_attempts (user_id, course_code, question_id, set_id, is_correct, attempt_count, last_attempted_at)
        VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, course_code, question_id) 
        DO UPDATE SET 
            attempt_count = student_question_attempts.attempt_count + 1,
            is_correct = excluded.is_correct,
            last_attempted_at = CURRENT_TIMESTAMP
    `;
    try {
        await repository.run(sql, [userId, courseCode, questionId, setId, isCorrect ? 1 : 0]);
        res.json({ success: true });
    } catch (err) {
        console.error("Attempt Record Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// Secure Proxy for Gemini Grading
app.post('/api/grade', aiLimiter, async (req, res) => {
    try {
        const { contents } = req.body;
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: "Server misconfiguration: No API Key." });
        }
        // Minimal logging for production
        console.log("Server: Proxying grading request to Gemini (Model: gemini-3-pro-preview)...");

        // Initialize Service (Scoped to request or singleton? server.js is singleton-ish, but let's init here to be safe with env)
        // Optimization: Could move instantiation outside if key doesn't change, but this is safe.
        const geminiService = new GeminiService(process.env.GEMINI_API_KEY, 'gemini-3-pro-preview');

        const data = await geminiService.generateContent(contents);
        res.json(data);
    } catch (err) {
        console.error("Proxy Error:", err);
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
app.get('/api/config/:courseCode', (req, res) => {
    res.json({ found: true, maxQuestions: 10, activeModel: 'gemini-1.5-flash', promptText: null });
});

// Questions Endpoint (Delegates to Repository)
app.get('/api/courses/:courseCode/questions', async (req, res) => {
    const { courseCode } = req.params;
    const setId = req.query.setId; // Optional: ?setId=2
    const academicYear = req.query.academicYear || 'AY2025'; // Default or strict?
    const semester = req.query.semester || 'Semester 2';

    try {
        // Use Repository to get SORTED questions with fully qualified context
        const questions = await repository.getQuestions(courseCode, academicYear, semester, setId);
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Application Config (Dynamic Context)
app.get('/api/config', async (req, res) => {
    try {
        const row = await repository.get("SELECT * FROM course_offerings WHERE is_active = 1 LIMIT 1");
        // Fallback or DB Logic
        const baseConfig = row ? {
            courseCode: row.course_code,
            courseName: row.course_name,
            academicYear: row.academic_year,
            semester: row.semester,
            iconUrl: row.icon_url,
            promptTemplate: row.prompt_template || 'You are an AI Tutor for Engineering Mathematics. Analyze the student answer for the given question. \n\nQuestion: {{questionText}}\nCorrect Answer: {{answerKey}}\nStudent Answer: {{studentAnswer}}\n\nYour task:\n1. determine if the answer is conceptually correct (even if format differs slightly). \n2. Provide a helpful explanation or hint if incorrect, based on this policy: {{hintPolicy}}.\n\nRespond STRICTLY in JSON format:\n{\n  "correct": boolean,\n  "explanation": "string"\n}',
        } : {
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

// --- FACULTY API ---

// Check Role
app.get('/api/auth/role', async (req, res) => {
    const { userId, courseCode, academicYear, semester } = req.query;
    try {
        const row = await repository.getUserRole(userId, courseCode, academicYear, semester);
        res.json({ role: row ? row.role : 'student' }); // Default to student
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Config (Faculty Only)
app.post('/api/courses/:courseCode/config', async (req, res) => {
    const { courseCode } = req.params;
    const { userId, academicYear, semester, config } = req.body;

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

// Analytics (Faculty Only)
app.get('/api/analytics/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const { userId, academicYear, semester } = req.query;

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

// --- SETS API (Faculty Only) ---
app.get('/api/sets/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const { userId, academicYear, semester } = req.query;

    if (!userId) {
        // Allow public/student read? For now, students need sets to filter? 
        // Student logic: gets Sets via client-side logic or `getQuestions`.
        // Let's assume this endpoint is for fetching METADATA (sequence, visibility) mainly for management.
        // Actually Student logic might need this to know what sets exist if we dynamic sequence.
        // But for now strict Faculty Check for Management. 
        // Wait, repository.getSets is used by getSets. 
        // Let's allow read for all if authenticated? Or just Faculty for editing view.
        // Faculty Dashboard calls this.
    }

    // For editing, we enforce faculty.
    try {
        const sets = await repository.getSets(courseCode, academicYear, semester);
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
        await repository.upsertSet(courseCode, academicYear, semester, set);
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
app.post('/api/progress', async (req, res) => {
    const { userId, courseCode, academicYear, semester, currentSetId, currentDifficulty, lastActiveQuestionUuid, data } = req.body;
    try {
        await repository.saveProgress(userId, courseCode, academicYear, semester, {
            currentSetId, currentDifficulty, lastActiveQuestionId: lastActiveQuestionUuid, data: JSON.stringify(data)
        });
        res.json({ success: true });
    } catch (err) {
        console.error("Progress Save Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/progress/:courseCode/:userId', async (req, res) => {
    const { courseCode, userId } = req.params;
    const { academicYear, semester } = req.query;
    try {
        const row = await repository.getProgress(userId, courseCode, academicYear, semester);
        if (row) {
            res.json({ found: true, data: JSON.parse(row.data) });
        } else {
            res.json({ found: false });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- QUESTIONS API (Faculty Only) ---
app.post('/api/questions', async (req, res) => {
    const { userId, question } = req.body;
    // Context (Handle camel/snake case mismatch)
    const courseCode = question.courseCode || question.course_code;
    const academicYear = question.academicYear || question.academic_year;
    const semester = question.semester;

    const roleRow = await repository.getUserRole(userId, courseCode, academicYear, semester);
    if (!roleRow || roleRow.role !== 'faculty') return res.status(403).json({ error: "Unauthorized" });

    try {
        await repository.upsertQuestion(question);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/questions/:id', async (req, res) => {
    const { id } = req.params;
    const { userId, courseCode, academicYear, semester } = req.query;

    const roleRow = await repository.getUserRole(userId, courseCode, academicYear, semester);
    if (!roleRow || roleRow.role !== 'faculty') return res.status(403).json({ error: "Unauthorized" });

    try {
        await repository.deleteQuestion(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(HTTP_PORT, () => {
    console.log(`[ATAS Agent] HTTP Server running on port ${HTTP_PORT}`);
    // Initialize DB (Tables + Seeding managed by Repository)
    repository.initDB();
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
