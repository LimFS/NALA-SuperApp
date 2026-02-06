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
import dotenv from 'dotenv';

// --- CONFIG ---
dotenv.config(); // Load .env
const HTTP_PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'atas.db');

// --- DATABASE SETUP ---
const db = new sqlite3.Database(DB_PATH);

// Scalability Optimization: Enable Write-Ahead Logging (WAL) for concurrency
db.configure('busyTimeout', 5000); // Wait up to 5s if locked
db.exec('PRAGMA journal_mode = WAL;');

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

    // SEED QUESTIONS (MH1810)
    db.get("SELECT count(*) as count FROM questions WHERE course_code = 'MH1810'", (err, row) => {
        if (row && row.count === 0) {
            console.log("Seeding MH1810 Questions...");
            const qMH = [
                ['MH1810', 1, "Recall the definition: What is the derivative of sin(x)?", 'text', null, JSON.stringify(["cos(x)"]), "Starts with 'c'.", "d/dx(sin x) = cos x.", null, 1, "Calculus Fundamentals"],
                ['MH1810', 1, "Look at the graph below. Is the function continuous at x=0?", 'text', null, JSON.stringify(["no", "jump"]), "Check limits.", "Jump discontinuity at x=0.", JSON.stringify({ type: 'image', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Discontinuity_jump.svg/440px-Discontinuity_jump.svg.png', alt: 'Graph' }), 1, "Graph Analysis"],
                ['MH1810', 1, "Explain what the definite integral represents geometrically.", 'text', null, JSON.stringify(["area"]), "Under the curve.", "Net signed area.", null, 2, "Integration Concepts"],
                ['MH1810', 1, "Calculate the integral of f(x) = 2x from x=0 to x=3.", 'text', null, JSON.stringify(["9", "nine"]), "Recall the power rule: ∫x^n = x^(n+1)/(n+1).", "[x^2] from 0 to 3 is 9 - 0 = 9.", null, 3, "Fundamental Theorem of Calculus"],

                // Set 2: Vectors
                // Level 1: Remember
                ['MH1810', 2, "What is a vector?", 'text', null, JSON.stringify(["magnitude", "direction"]), "It has both ___ and ___.", "A quantity with magnitude and direction.", null, 1, "Vector Definition"],
                ['MH1810', 2, "Which notation represents a vector?", 'mcq', JSON.stringify(["x", "v", "vec(v)", "5"]), JSON.stringify(["vec(v)"]), "Look for the arrow.", "vec(v) denotes a vector.", null, 1, "Vector Notation"],
                // Level 2: Understand
                ['MH1810', 2, "Describe the zero vector.", 'text', null, JSON.stringify(["0,0", "zero magnitude"]), "What is its length?", "Magnitude 0, no specific direction.", null, 2, "Zero Vector"],
                ['MH1810', 2, "If u = <2,3>, what is 2u?", 'text', null, JSON.stringify(["<4,6>"]), "Multiply each component by 2.", "<4, 6>.", null, 2, "Scalar Multiplication"],

                // Level 3: Apply
                ['MH1810', 2, "Given u = <1, 2> and v = <3, 4>, calculate u + v.", 'text', null, JSON.stringify(["<4, 6>"]), "Add components.", "<1+3, 2+4>.", null, 3, "Vector Arithmetic"],
                ['MH1810', 2, "Find the magnitude of vector <3, 4>.", 'text', null, JSON.stringify(["5"]), "Pythagoras.", "sqrt(9+16)=5.", null, 3, "Magnitude Calculation"],
                ['MH1810', 1, "Analyze the graph below. If this represents velocity v(t), at what point is acceleration zero?", 'mcq', JSON.stringify(["Points A and B", "Points B only", "Points A and C", "Points C only"]), JSON.stringify(["Points A and C"]), "Acceleration is the slope of velocity. Look for turning points.", "Correct. Acceleration is zero at points A and C, where the tangent to the velocity curve is horizontal (turning points).", JSON.stringify({ type: 'image', url: 'http://localhost:3001/velocity_graph.png', alt: 'Velocity Graph' }), 4, "Motion Analysis"],
                ['MH1810', 2, "Are the vectors <2, 4> and <3, 6> linearly independent?", 'text', null, JSON.stringify(["no"]), "Check if one is a scalar multiple of the other.", "<3, 6> = 1.5 * <2, 4>, so they are dependent.", null, 4, "Linear Independence"],
                ['MH1810', 2, "If a x b = 0, what does this imply about non-zero vectors a and b?", 'text', null, JSON.stringify(["parallel", "collinear"]), "sin(theta) is 0.", "They are parallel.", null, 4, "Cross Product Properties"],
                ['MH1810', 1, "Evaluate convergence: Does ∫(1/x) dx from 1 to infinity converge?", 'text', null, JSON.stringify(["diverge", "diverges"]), "Evaluate the limit of ln(x) as x -> infinity.", "It results in ln(∞) which is infinite, so it diverges.", null, 5, "Improper Integrals"],
                ['MH1810', 2, "Evaluate if {<1,0>, <0,1>, <1,1>} forms a basis for R2.", 'text', null, JSON.stringify(["no", "false"]), "How many vectors are needed for a basis in R2?", "A basis for R2 must have exactly 2 linearly independent vectors.", null, 5, "Basis Evaluation"],
                ['MH1810', 2, "Evaluate: 'Cross product is commutative'. True or False?", 'text', null, JSON.stringify(["false"]), "Does a x b = b x a?", "It is anti-commutative: a x b = -(b x a).", null, 5, "Vector Logic"],
                ['MH1810', 1, "Create an integral expression for the volume of a sphere of radius R using rotation.", 'text', null, JSON.stringify(["pi", "r^2"]), "Rotate a semi-circle y = √(R^2 - x^2) about the x-axis.", "V = ∫ π(√(R^2 - x^2))^2 dx from -R to R = 4/3 πR^3.", null, 6, "Modeling"],
                ['MH1810', 2, "Construct a vector that is perpendicular to both <1,0,0> and <0,1,0>.", 'text', null, JSON.stringify(["<0,0,1>", "k", "z-axis", "0,0,1"]), "Think about the standard basis vectors i, j, k.", "<0,0,1> (k) is perpendicular to i and j.", null, 6, "Problem Construction"],
                ['MH1810', 2, "Create the parametric equations for a line passing through (1,1) with direction <2,3>.", 'text', null, JSON.stringify(["1+2t", "1+3t", "x=1+2t"]), "x = x0 + at, y = y0 + bt.", "x = 1 + 2t, y = 1 + 3t.", null, 6, "Parametric Design"]
            ];
            const stmt = db.prepare("INSERT INTO questions (id, question_id, course_code, academic_year, semester, set_id, question_set_name, question_text, type, options, answer_key, hint, explanation, media, difficulty, context) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            qMH.forEach((q, i) => {
                const uuid = `MH1810_AY2025_S2_S${q[1]}_Q${i + 1}`;
                stmt.run(
                    uuid,
                    String(i + 1),
                    q[0],
                    'AY2025',
                    'Semester 2',
                    q[1],
                    q[1] === 1 ? 'Calculus Fundamentals' : 'Vector Analysis',
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
    db.run(`CREATE TABLE IF NOT EXISTS student_question_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        course_code TEXT NOT NULL,
        question_id TEXT NOT NULL,
        set_id INTEGER,
        attempt_count INTEGER DEFAULT 1,
        is_correct BOOLEAN DEFAULT 0,
        last_attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, course_code, question_id)
    )`);

    // ... (rest of questions table setup) ...
});

// --- EXPRESS SERVER ---
const app = express();
app.use(cors());
app.use(express.json());

// Serve Static Assets (Built UI) from 'dist'
app.use(express.static(join(__dirname, 'dist')));

// API Endpoints

// 1. Record Attempt (UPSERT)
app.post('/api/progress/attempt', (req, res) => {
    const { userId, courseCode, questionId, setId, isCorrect } = req.body;

    // SQLite UPSERT Syntax
    const sql = `
        INSERT INTO student_question_attempts (user_id, course_code, question_id, set_id, is_correct, attempt_count, last_attempted_at)
        VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, course_code, question_id) 
        DO UPDATE SET 
            attempt_count = student_question_attempts.attempt_count + 1,
            is_correct = excluded.is_correct,
            last_attempted_at = CURRENT_TIMESTAMP
    `;

    db.run(sql, [userId, courseCode, questionId, setId, isCorrect ? 1 : 0], function (err) {
        if (err) {
            console.error("Attempt Record Error:", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, attempts: this.changes }); // Note: changes might not reflect total count, just row update
    });
});

// Secure Proxy for Gemini Grading
app.post('/api/grade', async (req, res) => {
    try {
        const { contents } = req.body;

        // Debug Logging
        if (!process.env.GEMINI_API_KEY) {
            console.error("Server: GEMINI_API_KEY is missing from env!");
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
            console.error("Server: Gemini API Error", apiRes.status, errData);
            return res.status(apiRes.status).json(errData);
        }

        const data = await apiRes.json();
        console.log("Server: Grading success.");
        res.json(data);
    } catch (err) {
        console.error("Proxy Error:", err);
        res.status(500).json({ error: err.message });
    }
});

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
    res.json({ found: true, maxQuestions: 10, activeModel: 'gemini-1.5-flash', promptText: null });
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
    console.error(`[ATAS Agent] HTTP Server running on port ${HTTP_PORT}`);
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
    // Handle atas://progress/{id} logic here if needed (omitted for brevity in prototype)
    throw new Error("Resource not found");
});

// Start MCP
const transport = new StdioServerTransport();
server.connect(transport).catch(err => {
    console.error("MCP Connection Error:", err);
});
