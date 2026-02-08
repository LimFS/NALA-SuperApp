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
import { sanitizeInput } from './guardrails.js'; // Defensive Design
import { analyzeImage, describeImage, gradeAnswer } from './vision.js';
import generator from './src/modules/QuestionGenerator.js';

// --- CONFIG ---
const HTTP_PORT = process.env.PORT || 3005;
const __dirname = dirname(fileURLToPath(import.meta.url));

// --- DATABASE SETUP ---
repository.initDB();

// --- EXPRESS SERVER ---
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased for Base64
// --- API ROUTER ---
const apiRouter = express.Router();

apiRouter.post('/describe-image', async (req, res) => {
    try {
        const { image, mimeType } = req.body;
        if (!image) return res.status(400).json({ error: "No image provided" });

        const description = await describeImage(image, mimeType || 'image/png');
        res.json({ description });
    } catch (e) {
        console.error("Describe Error:", e);
        res.status(500).json({ error: e.message });
    }
});


// ... (Existing Setup) ...

apiRouter.post('/grade', async (req, res) => {
    try {
        const { userId, courseCode, academicYear, semester, inputBundle } = req.body;
        const questionId = req.body.questionId || inputBundle.questionId;
        const setId = req.body.setId || inputBundle.setId;

        if (!userId || !courseCode || !inputBundle) {
            return res.status(400).json({ error: 'Missing required fields: userId, courseCode, inputBundle' });
        }

        // 1. Generate UDI (Privacy)
        const udi = generateUDI(userId, courseCode, academicYear || '2025');

        let score = 0;
        let maxScore = 10;
        let feedback = "Grading complete.";
        let trace = { steps: ["Received Input"] };
        let isCorrect = false;

        // 2. Vision Analysis (If file present)
        if (inputBundle.file && inputBundle.file.content) {
            trace.steps.push(`Detected File: ${inputBundle.file.name}`);
            try {
                const visionData = await analyzeImage(inputBundle.file.content, inputBundle.file.type);
                trace.vision_analysis = visionData;
                trace.steps.push(`Vision Analysis Complete: Detected ${visionData.objects.length} objects.`);

                // Diagram validation logic (simplified)
                if (visionData.objects.some(obj => obj.toLowerCase().includes("circuit") || obj.toLowerCase().includes("resistor"))) {
                    score += 5;
                    trace.steps.push("Circuit diagram validated (+5 pts).");
                }
            } catch (vErr) {
                console.warn("Vision Analysis Failed:", vErr);
                trace.steps.push("Vision Analysis Failed.");
            }
        }

        // 3. Grading Logic (Gemini 1.5 Flash)
        if (inputBundle.studentAnswer) { // Text/LaTeX Answer
            const questionText = inputBundle.questionText || "Unknown Question";
            // Enhanced Context Extraction
            const context = inputBundle.context || "";
            const rubric = inputBundle.rubrics || inputBundle.rubric || { keywords: [] };
            const hint = inputBundle.hint || "";
            const correctAnswer = inputBundle.answerKey ? (Array.isArray(inputBundle.answerKey) ? inputBundle.answerKey[0] : inputBundle.answerKey) : "";

            trace.steps.push("Invoking AI Grader (Gemini 3 Pro Preview)...");
            const gradeResult = await gradeAnswer(
                questionText,
                inputBundle.studentAnswer,
                rubric,
                context,
                hint,
                correctAnswer
            );

            score = gradeResult.score;
            feedback = gradeResult.feedback;
            isCorrect = gradeResult.score >= 5; // Semantic correctness threshold
            trace.ai_grade = gradeResult;
            trace.steps.push(`AI Grader Score: ${score}/10`);
        } else if (!inputBundle.file) {
            score = 0;
            feedback = "No answer provided.";
        }

        score = Math.min(score, maxScore);

        // 4. Save Record (Trace)
        const recordId = crypto.randomUUID();
        await repository.saveGradingRecord({
            id: recordId, udi, user_id: userId,
            course_code: courseCode, academic_year: academicYear || '2025', semester: semester || '2',
            question_id: questionId, set_id: setId ? Number(setId) : null,
            input_bundle: inputBundle, score, max_score: maxScore, grading_trace: trace
        });

        // 5. Save Progress (Analytics) - NEW
        if (repository.saveAttempt && questionId) {
            await repository.saveAttempt({
                user_id: userId,
                course_code: courseCode,
                question_id: questionId,
                set_id: setId ? Number(setId) : null,
                is_correct: score >= 8 // Strict threshold for "Mastery" in analytics, or use isCorrect from AI?
            });
        }

        // 6. Response
        res.json({
            success: true,
            grade: {
                score,
                maxScore,
                feedback,
                traceId: recordId
            }
        });

    } catch (err) {
        console.error("Grading Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Legacy Progress Endpoint
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

// Config Endpoint
apiRouter.get('/config/:courseCode', (req, res) => {
    res.json({ found: true, maxQuestions: 6, activeModel: 'gemini-1.5-flash', promptText: "You are an AI Grader." });
});

// Questions Endpoint
apiRouter.get('/courses/:courseCode/questions', async (req, res) => {
    const { courseCode } = req.params;
    const academicYear = req.query.academicYear || '2025';
    const semester = req.query.semester || '2';
    try {
        const rows = await repository.getQuestions(courseCode, academicYear, semester);

        // Transform for Frontend (Parse JSON fields)
        const questions = rows.map(q => ({
            ...q,
            options: q.options ? JSON.parse(q.options) : null,
            answerKey: q.answer_key ? JSON.parse(q.answer_key) : [], // camelCase for frontend
            media: q.media ? JSON.parse(q.media) : null
        }));
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ADMIN ENDPOINTS ---

apiRouter.post('/admin/seed-questions', async (req, res) => {
    try {
        const { courseCode, count, academicYear, semester } = req.body;
        const qty = count || 5;
        const ay = academicYear || '2025';
        const sem = semester || '2';

        console.log(`[Admin] Generating ${qty} questions for ${courseCode} (${ay}/${sem})...`);

        // Use Bloom's Taxonomy Generator
        const newQuestions = generator.generateQuestions(courseCode, ay, sem, qty);

        // In a real implementation we would save to DB here.
        // For now, we return them so frontend can see what "would" be seeded, 
        // OR we just log them. The user asked to "emulate seeding".
        console.log(`[Admin] Generated ${newQuestions.length} questions.`);

        res.json({ message: `Generated ${newQuestions.length} questions`, data: newQuestions });

    } catch (e) {
        console.error("Seed Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// Mount Router at multiple paths for Gateway/Direct compatibility
// Mount Router at multiple paths for Gateway/Direct compatibility
app.use('/api', apiRouter);
app.use('/ee2101/api', apiRouter); // Alias for production/gateway routing
app.use('/ee2101/api', apiRouter);
app.use(express.static(join(__dirname, 'dist')));
app.use('/ee2101', express.static(join(__dirname, 'dist')));

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
