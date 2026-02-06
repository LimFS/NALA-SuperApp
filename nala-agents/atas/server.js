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

// --- CONFIG ---
dotenv.config(); // Load .env
const HTTP_PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const __dirname = dirname(fileURLToPath(import.meta.url));

// --- EXPRESS SERVER ---
const app = express();
app.use(cors());
app.use(express.json());

// Serve Static Assets (Built UI) from 'dist'
app.use(express.static(join(__dirname, 'dist')));

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
app.post('/api/grade', async (req, res) => {
    try {
        const { contents } = req.body;
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: "Server misconfiguration: No API Key." });
        }
        console.log("Server: Proxying grading request to Gemini...");
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
        const apiRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });
        if (!apiRes.ok) {
            const errData = await apiRes.json();
            return res.status(apiRes.status).json(errData);
        }
        const data = await apiRes.json();
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
        const row = await repository.get("SELECT course_code, course_name, academic_year, semester FROM course_offerings WHERE is_active = 1 LIMIT 1");
        if (!row) {
            // Fallback if DB is empty
            return res.json({
                courseCode: 'MH1810',
                courseName: 'Mathematics 2',
                academicYear: 'AY2025',
                semester: 'Semester 2'
            });
        }
        res.json({
            courseCode: row.course_code,
            courseName: row.course_name,
            academicYear: row.academic_year,
            semester: row.semester
        });
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
