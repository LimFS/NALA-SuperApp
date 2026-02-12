
import { GoogleGenerativeAI } from "@google/generative-ai";
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
const analyzeImageReal = async (base64Data, mimeType, apiKey) => {
    console.log(`[Vision Service] Using GEMINI PRO VISION...`);
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Using "Gemini 3 Pro Preview" as confirmed by API listing
        const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

        const prompt = "Analyze this image. Identify if it is a circuit diagram. List the components found (e.g. Resistor, Capacitor) and any text labels. format output as JSON with keys: detected_text, objects (array), diagram_type, confidence.";

        const imagePart = {
            inlineData: {
                data: base64Data.split(',')[1] || base64Data, // Handle data:image/png;base64,... prefix
                mimeType: mimeType
            }
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        // Basic JSON cleanup (remove markdown code blocks if present)
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return { ...JSON.parse(jsonStr), source: "gemini-1.5-flash" };

    } catch (error) {
        console.error("[Vision Service] API Error:", error);
        throw error; // Let wrapper handle fallback
    }
};

// --- MAIN EXPORT ---
export const analyzeImage = async (base64Data, mimeType) => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
        try {
            return await analyzeImageReal(base64Data, mimeType, apiKey);
        } catch (e) {
            console.warn("[Vision Service] Fallback to Mock due to API Error.");
            return analyzeImageMock(base64Data, mimeType);
        }
    } else {
        console.warn("[Vision Service] No API Key found (GEMINI_API_KEY). Using Mock.");
        return analyzeImageMock(base64Data, mimeType);
    }
};
// ... (Existing exports) ...

export const gradeAnswer = async (questionText, studentAnswer, rubric, context, hint, correctAnswer) => {
    const apiKey = process.env.GEMINI_API_KEY;

    // --- FALLBACK LOGIC MOVED TO BOTTOM ---

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
        const genAI = new GoogleGenerativeAI(apiKey);
        // User requested Gemini 3 Pro Preview
        const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extract JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return { ...parsed, source: "ai_gemini" };
        }
        console.warn("Could not parse AI JSON. Fallback.");
        return useFallback(studentAnswer, correctAnswer);
    } catch (e) {
        console.error("AI Grading Error:", e);
        return useFallback();
    }
};

// --- FALLBACK LOGIC (Hoisted) ---
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
    // 2. Partial Match (Simple Heuristic for circuit/voltage keywords if key is missing)
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
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return "Image description unavailable (No API Key).";

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // User requested Gemini 3 Pro Preview
        const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

        const prompt = "Extract all text and mathematical expressions from this image into LaTeX format. If it is a diagram, describe it concisely. Output ONLY the raw text/LaTeX content, no markdown formatting.";

        const imagePart = {
            inlineData: {
                data: base64Data.split(',')[1] || base64Data,
                mimeType: mimeType
            }
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        return response.text().replace(/```latex/g, '').replace(/```/g, '').trim();
    } catch (e) {
        console.error("[Vision Service] Description Error:", e);
        return "Error analyzing image.";
    }
};
