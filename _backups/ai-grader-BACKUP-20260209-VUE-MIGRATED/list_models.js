
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No API Key found.");
        return;
    }

    console.log("Using Key:", apiKey.substring(0, 10) + "...");

    // Cannot list models directly via GoogleGenerativeAI client in this version easily without a specific call,
    // but we can try a raw fetch to the REST API equivalent to debug.

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.error) {
            console.error("API Error:", data.error);
        } else if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name} (${m.displayName})`);
                }
            });
        } else {
            console.log("No models returned.", data);
        }
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

listModels();
