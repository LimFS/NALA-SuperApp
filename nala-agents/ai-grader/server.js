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
const HTTP_PORT = process.env.PORT || 3005;
const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'ee2101.db');

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

    // SEED QUESTIONS (EE2101)
    db.get("SELECT count(*) as count FROM questions WHERE course_code = 'EE2101'", (err, row) => {
        if (row && row.count === 0) {
            console.log("Seeding EE2101 Circuit Analysis Questions...");
            const qEE = [
                // Set 1: Basic Circuits
                ['EE2101', 1, "What does Kirchhoff's Current Law (KCL) state?", 'text', null, JSON.stringify(["sum", "entering", "leaving", "zero"]), "Conservation of charge at a node.", "The sum of currents entering a node equals the sum of currents leaving it.", null, 1, "KCL"],
                ['EE2101', 1, "Calculate the equivalent resistance of two 10-ohm resistors in parallel.", 'text', null, JSON.stringify(["5", "5 ohm"]), "R_eq = (R1*R2)/(R1+R2).", "5 Ohms.", null, 1, "Resistor Circuits"],
                ['EE2101', 1, "True or False: Voltage across parallel components is the same.", 'mcq', JSON.stringify(["True", "False"]), JSON.stringify(["True"]), "Think about how they are connected.", "True.", null, 1, "Circuit Properties"],

                // Set 2: AC Analysis
                ['EE2101', 2, "What is the impedance of a capacitor?", 'text', null, JSON.stringify(["1/jwC", "-j/wC"]), "Depends on frequency w and capacitance C.", "Z_c = 1 / (j * omega * C).", null, 2, "Impedance"],
                ['EE2101', 2, "In an RLC series circuit, what happens at resonance?", 'mcq', JSON.stringify(["Z is minimum", "Z is maximum", "Current is zero"]), JSON.stringify(["Z is minimum"]), "Impedance is purely resistive.", "Impedance is minimum (purely resistive) and current is maximum.", null, 2, "Resonance"],
                ['EE2101', 2, "Define 'Power Factor'.", 'text', null, JSON.stringify(["real", "apparent", "cosine"]), "Ratio of two powers.", "Ratio of Real Power to Apparent Power (cos phi).", null, 3, "Power Analysis"]
            ];
            const stmt = db.prepare("INSERT INTO questions (id, question_id, course_code, academic_year, semester, set_id, question_set_name, question_text, type, options, answer_key, hint, explanation, media, difficulty, context) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            qEE.forEach((q, i) => {
                const uuid = `EE2101_AY2025_S2_S${q[1]}_Q${i + 1}`;
                stmt.run(
                    uuid,
                    String(i + 1),
                    q[0],
                    'AY2025',
                    'Semester 2',
                    q[1],
                    q[1] === 1 ? 'Basic Circuits' : 'AC Analysis',
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
    res.json({ found: true, maxQuestions: 6, activeModel: 'gemini-1.5-flash', promptText: "You are an AI Grader." });
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
    console.error(`[AIGrader] HTTP Server running on port ${HTTP_PORT}`);
});

// --- MCP SERVER (Low-Level Implementation) ---
const server = new Server(
    { name: "ai-grader-agent", version: "1.0.0" },
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
                text: `http://localhost:${HTTP_PORT}/ee2101_circuit.png`
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
