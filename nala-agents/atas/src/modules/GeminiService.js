import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiService {
    constructor(apiKey, modelName = "gemini-3-pro-preview") {
        if (!apiKey) throw new Error("GeminiService: API Key is required.");
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: modelName });
    }

    async generateContent(contents) {
        try {
            console.log("GeminiService: Generating content with model", this.model.model);
            // SDK accepts array of content or an object with contents
            // If contents is already an array of { role, parts }, we can pass it directly 
            // BUT verify SDK signature. 
            // model.generateContent([ ... ]) or model.generateContent({ contents: [...] })

            const result = await this.model.generateContent({ contents });
            const response = await result.response;

            // Map to standard REST structure for frontend compatibility
            return {
                candidates: response.candidates,
                promptFeedback: response.promptFeedback
            };
        } catch (error) {
            console.error("GeminiService Error:", error);
            throw error;
        }
    }
    async generateQuestions(context, taxonomy, mcqCount, textCount, mediaPreference, instructions) {
        const prompt = `
            You are an expert Engineering Tutor. Create a question set for a course.
            
            Context: ${JSON.stringify(context)}
            Taxonomy Level: ${taxonomy}
            Requirements:
            - Generate ${mcqCount} Multiple Choice Questions (MCQ).
            - Generate ${textCount} Open-Ended Text Questions.
            - Media Preference: ${mediaPreference} (If 'active', suggest a relevant image description in 'media' field).
            - Additional Instructions: ${instructions}
            - SORT ORDER: Arrange questions in ASCENDING order of difficulty (Level 1 to Level 6).

            Strict Output Schema (JSON Array of Objects):
            [
              {
                "question_text": "string",
                "type": "mcq" | "text",
                "options": ["A", "B", "C", "D"] (Max 4, required for MCQ, empty for text),
                "answer_key": ["Correct Option Text"] (Array of strings),
                "explanation": "Detailed explanation of the solution",
                "hint": "A helpful nudging hint",
                "context": "Background context if needed",
                "difficulty": 1-6 (Integer based on Taxonomy),
                "media": { "description": "visual description" } (Optional)
              }
            ]
            
            IMPORTANT:
            - Return ONLY the JSON Array. No markdown formatting.
            - Ensure "answer_key" exactly matches one of the "options" for MCQ.
            - For 'text' questions, "answer_key" should contain key phrase(s) or model answer.
        `;

        try {
            // Re-use generateContent - it expects "contents" as array or object
            // If the prompt is simple string, wrap it
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            // Clean Markdown wrappers if present
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(jsonStr);

            // Post-Generation Sort: Guarantee ascending order by difficulty
            // This acts as a failsafe even if the AI ignores the sort instruction
            if (Array.isArray(parsed)) {
                parsed.sort((a, b) => (vehicleVal(a.difficulty) - vehicleVal(b.difficulty)));
            }

            return parsed;
        } catch (error) {
            console.error("Gemini Generation Failed:", error);
            throw new Error("AI Generation Failed: " + error.message);
        }
    }
}

// Helper to handle potential string/int variance in difficulty
function vehicleVal(d) {
    return Number(d) || 0;
}
