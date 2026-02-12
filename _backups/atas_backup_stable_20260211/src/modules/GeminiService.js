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
}
