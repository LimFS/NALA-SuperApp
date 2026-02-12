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
import crypto from 'crypto'; // For UUID
// DYNAMIC REPOSITORY SELECTION (Anti-Gravity Polyglot Persistence)
import repoSQLite from './repository.js';
import repoPG from './repository_pg.js';

const repository = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost:5432/ai_grader")
    ? repoPG
    : (process.env.DATABASE_URL ? repoPG : repoSQLite);

if (!process.env.DATABASE_URL) console.log("[Server] Using SQLite (No DATABASE_URL provided).");
else console.log("[Server] Using Postgres Repository.");
import { generateUDI } from './udi.js';
import { sanitizeInput } from './guardrails.js';
import { analyzeImage, describeImage, gradeAnswer } from './vision.js';
import generator from './src/modules/QuestionGenerator.js';
import { JobManager } from './src/modules/JobManager.js'; // Rule #2
// crypto already imported above or not needed if globally available in Node 20+, but safer to keep one.
// Checking file... ah, generateUDI might use it, or it was already there. 
// The error says "Identifier 'crypto' has already been declared", so I will remove this second import.

// --- CONFIG ---
const HTTP_PORT = process.env.PORT || 3005;
const __dirname = dirname(fileURLToPath(import.meta.url));
const jobManager = new JobManager(); // Global Job Manager

// --- DATABASE SETUP ---
// Init handled by repository/adapter
if (process.env.INIT_DB === 'true' || process.env.NODE_ENV !== 'production') {
    repository.initDB();
}

// --- EXPRESS SERVER ---
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- CACHE CONTROL MIDDLEWARE (Rule #4) ---
app.use((req, res, next) => {
    // API & Dynamic Data -> No Cache
    if (req.url.startsWith('/api') || req.url.startsWith('/ee2101/api')) {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
    // Static Assets -> Aggressive Cache
    else if (req.url.match(/\.(css|js|png|jpg|ico|svg|woff2)$/)) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable'); // 1 Year
    }
    next();
});

// --- API ROUTER ---
const apiRouter = express.Router();

apiRouter.post('/describe-image', async (req, res) => {
    try {
        const { image, mimeType } = req.body;
        if (!image) return res.status(400).json({ error: "No image provided" });
        const description = await describeImage(image, mimeType || 'image/png');
        res.json({ description });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- ASYNC JOB ENDPOINTS (High Concurrency) ---

// 1. Submit Job
apiRouter.post('/grade', (req, res) => { // Sync Handler, Async Work
    const { userId, courseCode, inputBundle } = req.body;

    if (!userId || !courseCode || !inputBundle) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Capture context immediately
    const jobPayload = req.body;
    const jobId = jobManager.create(jobPayload);

    // Start Async Processing (Fire & Forget from HTTP perspective)
    processGradingJob(jobId, jobPayload);

    // Return 202 Accepted immediately
    res.status(202).json({
        success: true,
        jobId,
        status: 'processing',
        message: 'Grading job started.'
    });
});

// 2. Poll Job
apiRouter.get('/jobs/:jobId', (req, res) => {
    const job = jobManager.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    res.json({
        jobId: job.id,
        status: job.status,
        result: job.result,
        error: job.error
    });
});

// --- WORKER LOGIC (Could be moved to separate worker.js) ---
const processGradingJob = async (jobId, payload) => {
    try {
        const { userId, courseCode, academicYear, semester, inputBundle } = payload;
        const questionId = payload.questionId || inputBundle.questionId;
        const setId = payload.setId || inputBundle.setId;

        // 1. Generate UDI
        const udi = generateUDI(userId, courseCode, academicYear || '2025', semester || '2');

        let score = 0;
        let maxScore = 10;
        let feedback = "Grading complete.";
        let trace = { steps: ["Job Started"] };
        let gradingMethod = "unknown";

        // 2. Vision Analysis
        if (inputBundle.file && inputBundle.file.content) {
            trace.steps.push(`Detected File: ${inputBundle.file.name}`);
            try {
                const visionData = await analyzeImage(inputBundle.file.content, inputBundle.file.type);
                trace.vision_analysis = visionData;
                trace.steps.push(`Vision Analysis Complete: Detected ${visionData.objects.length} objects.`);

                if (visionData.objects.some(obj => obj.toLowerCase().includes("circuit") || obj.toLowerCase().includes("resistor"))) {
                    score += 5;
                    trace.steps.push("Circuit diagram validated (+5 pts).");
                }
            } catch (vErr) {
                console.warn("Vision Error:", vErr);
                trace.steps.push("Vision Analysis Failed.");
            }
        }

        // 3. Grading Logic
        if (inputBundle.studentAnswer) {
            const questionText = inputBundle.questionText || "Unknown Question";
            const context = inputBundle.context || "";
            const rubric = inputBundle.rubrics || inputBundle.rubric || { keywords: [] };
            const hint = inputBundle.hint || "";
            const correctAnswer = inputBundle.answerKey ? (Array.isArray(inputBundle.answerKey) ? inputBundle.answerKey[0] : inputBundle.answerKey) : "";

            trace.steps.push("Invoking AI Grader...");
            const gradeResult = await gradeAnswer(questionText, inputBundle.studentAnswer, rubric, context, hint, correctAnswer);

            score = gradeResult.score;
            feedback = gradeResult.feedback;
            gradingMethod = gradeResult.source;
            trace.ai_grade = gradeResult;
            trace.grading_method = gradingMethod;
            trace.steps.push(`Grading Method: ${gradingMethod}. Score: ${score}/10`);
        } else if (!inputBundle.file) {
            score = 0;
            feedback = "No answer provided.";
        }

        score = Math.min(score, maxScore);

        // 4. Persistence
        const recordId = crypto.randomUUID();
        await repository.saveGradingRecord({
            id: recordId, udi, user_id: userId,
            course_code: courseCode, academic_year: academicYear || '2025', semester: semester || '2',
            question_id: questionId, set_id: setId ? Number(setId) : null,
            input_bundle: inputBundle, score, max_score: maxScore, grading_trace: trace
        });

        if (repository.saveAttempt && questionId) {
            await repository.saveAttempt({
                user_id: userId, course_code: courseCode, question_id: questionId,
                set_id: setId ? Number(setId) : null,
                is_correct: score >= 8
            });
        }

        // 5. Complete Job
        jobManager.complete(jobId, {
            score, maxScore, feedback, traceId: recordId
        });

    } catch (err) {
        console.error(`Job ${jobId} Failed:`, err);
        jobManager.fail(jobId, err);
    }
};

apiRouter.get('/progress/:courseCode/:userId', async (req, res) => {
    const { courseCode, userId } = req.params;
    const academicYear = req.query.academicYear || 'AY2025';
    const semester = req.query.semester || 'Semester 2';
    try {
        const row = await repository.getProgress(userId, courseCode, academicYear, semester);
        if (!row) return res.json({ found: false });
        res.json({ found: true, id: row.id, currentSetId: row.current_set_id, currentDifficulty: row.current_difficulty, data: JSON.parse(row.data) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.get('/config/:courseCode', (req, res) => {
    res.json({ found: true, maxQuestions: 6, activeModel: 'gemini-3-pro-preview', promptText: "You are an AI Grader." });
});

apiRouter.get('/courses/:courseCode/questions', async (req, res) => {
    const { courseCode } = req.params;
    const academicYear = req.query.academicYear || '2025';
    const semester = req.query.semester || '2';
    try {
        const rows = await repository.getQuestions(courseCode, academicYear, semester);
        const questions = rows.map(q => ({
            ...q,
            options: q.options ? JSON.parse(q.options) : null,
            answerKey: q.answer_key ? JSON.parse(q.answer_key) : [],
            media: q.media ? JSON.parse(q.media) : null
        }));
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin, Static Files, Listen...
apiRouter.post('/admin/seed-questions', async (req, res) => {
    try {
        const { courseCode, count, academicYear, semester } = req.body;
        const qty = count || 5;
        const newQuestions = generator.generateQuestions(courseCode, academicYear || '2025', semester || '2', qty);
        res.json({ message: `Generated ${newQuestions.length} questions`, data: newQuestions });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.use('/api', apiRouter);
app.use('/ee2101/api', apiRouter);
app.use(express.static(join(__dirname, 'dist')));
app.use('/ee2101', express.static(join(__dirname, 'dist')));

app.listen(HTTP_PORT, () => {
    console.error(`[AIGrader] HTTP Server running on port ${HTTP_PORT} (Async Mode)`);
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
