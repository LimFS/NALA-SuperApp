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
const HTTP_PORT = process.env.PORT || 3002;
const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'cc0001.db');

// --- DATABASE SETUP ---
const db = new sqlite3.Database(DB_PATH);
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS student_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        course_code TEXT,
        academic_year TEXT,
        semester TEXT,
        current_set_id INTEGER,
        current_difficulty INTEGER,
        last_active_question_id INTEGER,
        data TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, course_code, academic_year, semester)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        question_id TEXT,
        course_code TEXT,
        academic_year TEXT,
        semester TEXT,
        set_id INTEGER,
        question_set_name TEXT,
        question_text TEXT,
        type TEXT DEFAULT 'text',
        options TEXT,
        answer_key TEXT,
        hint TEXT,
        explanation TEXT,
        media TEXT,
        difficulty INTEGER,
        context TEXT
    )`);

    // SEED QUESTIONS (CC0001)
    db.get("SELECT count(*) as count FROM questions WHERE course_code = 'CC0001'", (err, row) => {
        if (row && row.count === 0) {
            console.log("Seeding CC0001 Design Thinking Questions...");
            const qCC = [
                // Set 1: Empathy
                ['CC0001', 1, "What is the first phase of the Design Thinking process?", 'mcq', JSON.stringify(["Define", "Empathize", "Ideate", "Prototype"]), JSON.stringify(["Empathize"]), "It starts with understanding the user.", "Empathize is the foundation.", null, 1, "Design Process"],
                ['CC0001', 1, "Why do we conduct user interviews?", 'text', null, JSON.stringify(["needs", "insights", "pain points"]), "To gather qualitative data.", "To uncover deep user needs and insights.", null, 1, "User Research"],
                ['CC0001', 1, "True or False: Design Thinking is a linear process.", 'mcq', JSON.stringify(["True", "False"]), JSON.stringify(["False"]), "Do you ever go back to previous steps?", "It is iterative, not linear.", null, 1, "Process Nature"],

                // Set 2: Define
                ['CC0001', 2, "What components make up a POV statement?", 'text', null, JSON.stringify(["user", "need", "insight"]), "User + ___ + ___.", "User, Need, and Insight.", null, 2, "POV components"],
                ['CC0001', 2, "Which tool helps synthesize empathy data?", 'mcq', JSON.stringify(["Empathy Map", "Sketching", "Prototyping", "Testing"]), JSON.stringify(["Empathy Map"]), "It maps say, do, think, feel.", "Empathy Map.", null, 2, "Synthesis Tools"],
                ['CC0001', 2, "Define 'Insight' in the context of Design Thinking.", 'text', null, JSON.stringify(["discovery", "truth", "unexpected"]), "It's not just a fact.", "A deep discovery about human behavior.", null, 3, "Insight Definition"]
            ];
            const stmt = db.prepare("INSERT INTO questions (id, question_id, course_code, academic_year, semester, set_id, question_set_name, question_text, type, options, answer_key, hint, explanation, media, difficulty, context) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            qCC.forEach((q, i) => {
                const uuid = `CC0001_AY2025_S2_S${q[1]}_Q${i + 1}`;
                stmt.run(
                    uuid,
                    String(i + 1),
                    q[0],
                    'AY2025',
                    'Semester 2',
                    q[1],
                    q[1] === 1 ? 'Empathy Phase' : 'Define Phase',
                    q[2], // text
                    q[3], // type
                    q[4], // options
                    q[5], // answer_key
                    q[6], // hint
                    q[7], // explanation
                    q[8], // media
                    q[9], // difficulty
                    q[10] // context
                );
            });
            stmt.finalize();
        }
    });
});

// --- EXPRESS SERVER ---
const app = express();
app.use(cors());
app.use(express.json());

// API Endpoints
app.get('/api/progress/:courseCode/:userId', (req, res) => {
    const { courseCode, userId } = req.params;
    const academicYear = req.query.academicYear || 'AY2025';
    const semester = req.query.semester || 'Semester 2';
    db.get("SELECT * FROM student_progress WHERE user_id = ? AND course_code = ? AND academic_year = ? AND semester = ?",
        [userId, courseCode, academicYear, semester], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.json({ found: false });
            res.json({ found: true, id: row.id, currentSetId: row.current_set_id, currentDifficulty: row.current_difficulty, data: JSON.parse(row.data) });
        });
});

// Config Endpoint
app.get('/api/config/:courseCode', (req, res) => {
    res.json({ found: true, maxQuestions: 6, activeModel: 'gemini-1.5-flash', promptText: "You are a Design Thinking Coach." });
});

// Questions Endpoint
app.get('/api/courses/:courseCode/questions', (req, res) => {
    const { courseCode } = req.params;
    db.all("SELECT * FROM questions WHERE course_code = ?", [courseCode], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Transform for Frontend (Parse JSON fields)
        const questions = rows.map(q => ({
            ...q,
            options: q.options ? JSON.parse(q.options) : null,
            answerKey: q.answer_key ? JSON.parse(q.answer_key) : [], // camelCase for frontend
            media: q.media ? JSON.parse(q.media) : null
        }));
        res.json(questions);
    });
});

// Serve UI
app.use(express.static(join(__dirname, 'dist')));

app.listen(HTTP_PORT, () => {
    console.error(`[DesignThinker] HTTP Server running on port ${HTTP_PORT}`);
});

// --- MCP SERVER (Low-Level Implementation) ---
const server = new Server(
    { name: "design-thinker-agent", version: "1.0.0" },
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
    // Handle atas://progress/{id} logic here if needed (omitted for brevity in prototype)
    throw new Error("Resource not found");
});

// Start MCP
const transport = new StdioServerTransport();
server.connect(transport).catch(err => {
    console.error("MCP Connection Error:", err);
});
