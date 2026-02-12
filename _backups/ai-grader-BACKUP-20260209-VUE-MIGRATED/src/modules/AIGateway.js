
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

/**
 * AI Gateway
 * Abstraction Layer for AI Model Access (Rule #5)
 * Centralizes model configuration, API key management, and error handling.
 */
class AIGateway {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        this.modelName = "gemini-3-pro-preview"; // Default, could be env-driven

        if (!this.apiKey) {
            console.warn("[AIGateway] No GEMINI_API_KEY found. gateway will fail or mock.");
        }

        this.genAI = new GoogleGenerativeAI(this.apiKey);
        this.model = this.genAI.getGenerativeModel({ model: this.modelName });
    }

    /**
     * Generates content from text prompt and optional images.
     * @param {string} prompt - The text prompt.
     * @param {Array} images - Array of { inlineData: { data, mimeType } } objects.
     * @returns {Promise<string>} - The generated text response.
     */
    async generateText(prompt, images = []) {
        try {
            console.log(`[AIGateway] Sending request to ${this.modelName}...`);
            const parts = [prompt, ...images];
            const result = await this.model.generateContent(parts);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("[AIGateway] Error:", error);
            throw error; // Re-throw for caller to handle
        }
    }

    /**
     * Generates a JSON object from the model response.
     * Enforces JSON formatting in the prompt if not already present, 
     * but primarily parses the output.
     * @param {string} prompt 
     * @param {Array} images 
     * @returns {Promise<Object>}
     */
    async generateJSON(prompt, images = []) {
        // Append JSON instruction if likely needed, though usually part of prompt.
        // For now, assume prompt contains "format output as JSON".

        const text = await this.generateText(prompt, images);

        // Attempt to parse JSON
        try {
            // loose parsing to find JSON block
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error("No JSON found in response");
        } catch (e) {
            console.error("[AIGateway] JSON Parse Error:", e);
            console.debug("[AIGateway] Raw Text:", text);
            throw e;
        }
    }
}

export const aiGateway = new AIGateway();
