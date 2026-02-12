
import { aiGateway } from './src/modules/AIGateway.js';
import dotenv from 'dotenv';
dotenv.config();

// --- MOCK IMPLEMENTATION ---
const analyzeImageMock = async (base64Data, mimeType) => {
    console.log(`[Vision Service] Using MOCK for ${mimeType} image...`);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Latency

    return {
        detected_text: "Figure 1: RLC Circuit. V = 10V, R = 5Ω, L = 2H, C = 1mF.",
        objects: ["Resistor", "Inductor", "Capacitor", "Voltage Source"],
        diagram_type: "Circuit Schematic",
        confidence: 0.98,
        source: "mock"
    };
};

// --- REAL IMPLEMENTATION ---
const analyzeImageReal = async (base64Data, mimeType) => {
    console.log(`[Vision Service] Using AI Gateway...`);
    try {
        const prompt = "Analyze this image. Identify if it is a circuit diagram. List the components found (e.g. Resistor, Capacitor) and any text labels. format output as JSON with keys: detected_text, objects (array), diagram_type, confidence.";

        const imagePart = {
            inlineData: {
                data: base64Data.split(',')[1] || base64Data,
                mimeType: mimeType
            }
        };

        // Use Gateway
        const result = await aiGateway.generateJSON(prompt, [imagePart]);
        return { ...result, source: "gemini-gateway" };

    } catch (error) {
        console.error("[Vision Service] Gateway Error:", error);
        throw error;
    }
};

// --- MAIN EXPORT ---
export const analyzeImage = async (base64Data, mimeType) => {
    // Basic check if Gateway is usable (has API key internally)
    // For now, we try calling it, if it fails, fallback.
    // Ideally Gateway should expose "isReady" or similar.
    // accessing private property for quick check or just Try/Catch block primarily.

    if (process.env.GEMINI_API_KEY) {
        try {
            return await analyzeImageReal(base64Data, mimeType);
        } catch (e) {
            console.warn("[Vision Service] Fallback to Mock due to Gateway Error:", e.message);
            return analyzeImageMock(base64Data, mimeType);
        }
    } else {
        console.warn("[Vision Service] No API Key (env). Using Mock.");
        return analyzeImageMock(base64Data, mimeType);
    }
};

export const gradeAnswer = async (questionText, studentAnswer, rubric, context, hint, correctAnswer) => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return useFallback(studentAnswer, correctAnswer);

    const prompt = `
    You are an expert AI Grader for Electrical Engineering (EE2101).
    Attributes: Strict, Educational, Encouraging.

    --- CONTEXT ---
    Background: "${context || 'General Question'}"
    Question: "${questionText}"
    Hint Provided: "${hint || 'None'}"
    Rubric/Keywords: ${JSON.stringify(rubric)}
    Reference Answer (For Logic Verification): "${correctAnswer}"

    --- STUDENT SUBMISSION ---
    Student Answer: "${studentAnswer}"

    --- TASK ---
    1. Evaluate the student's answer against the Question, Context, and Rubric.
    2. Use the Reference Answer to understand the INTENT, but do not penalize for different phrasing if the logic is correct.
    3. If the answer is unrelated or incorrect, give a low score.
    4. Provide concise feedback (max 2 sentences).
    
    Output Format (JSON Only):
    {
        "score": number, // 0-10
        "feedback": "string",
        "isCorrect": boolean
    }
    `;

    try {
        // Use Gateway
        const result = await aiGateway.generateJSON(prompt);
        return { ...result, source: "ai_gemini_gateway" };
    } catch (e) {
        console.error("AI Grading Error (Gateway):", e);
        return useFallback(studentAnswer, correctAnswer);
    }
};

// --- FALLBACK LOGIC ---
const useFallback = (studentAnswer, correctAnswer) => {
    console.warn("Using Fallback Grading (Keyword Match).");
    if (!studentAnswer) return { score: 0, feedback: "No answer provided.", isCorrect: false, source: "rules_empty" };

    const normStudent = String(studentAnswer).toLowerCase().trim();
    const normCorrect = String(correctAnswer || "").toLowerCase().trim();

    let score = 0;
    let feedback = "Incorrect.";
    let isCorrect = false;

    // 1. Exact/Close Match
    if (normCorrect && normStudent.includes(normCorrect)) {
        score = 10;
        feedback = "Correct! (Keyword Match)";
        isCorrect = true;
    }
    // 2. Partial Match
    else if (normStudent.includes("circuit") || normStudent.includes("voltage") || normStudent.includes("current")) {
        score = 2;
        feedback = "Partial credit for relevant terminology (AI Offline).";
    }
    else {
        feedback = "Incorrect (Fallback Mode).";
    }

    return { score, feedback, isCorrect, source: "rules_keyword_match" };
};

export const describeImage = async (base64Data, mimeType) => {
    if (!process.env.GEMINI_API_KEY) return "Image description unavailable (No API Key).";

    try {
        const prompt = "Extract all text and mathematical expressions from this image into LaTeX format. If it is a diagram, describe it concisely. Output ONLY the raw text/LaTeX content, no markdown formatting.";

        const imagePart = {
            inlineData: {
                data: base64Data.split(',')[1] || base64Data,
                mimeType: mimeType
            }
        };

        const text = await aiGateway.generateText(prompt, [imagePart]);
        return text.replace(/```latex/g, '').replace(/```/g, '').trim();

    } catch (e) {
        console.error("[Vision Service] Description Error (Gateway):", e);
        return "Error analyzing image.";
    }
};
