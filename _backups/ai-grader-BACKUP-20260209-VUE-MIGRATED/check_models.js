import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
console.log("Using API Key:", apiKey ? "FOUND" : "MISSING");

async function listModels() {
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Dummy init to Check key
        console.log("Checking available models...");
        // There isn't a direct listModels method exposed easily in the simple SDK sometimes, 
        // asking the model to identify itself or just trying the requested model is a better test.

        // Let's try to generate with the requested "gemini-3-pro-preview" to see if it works.
        // And also list standard ones if possible, but the SDK structure varies. 
        // We will try a simple prompt with the User's requested model.

        const toTry = ["gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-3-pro-preview"];

        for (const m of toTry) {
            console.log(`\nTesting Model: ${m}`);
            try {
                const model = genAI.getGenerativeModel({ model: m });
                const result = await model.generateContent("Hello, are you online?");
                const response = await result.response;
                console.log(`✅ ${m} is AVAILABLE. Response: ${response.text()}`);
            } catch (e) {
                console.log(`❌ ${m} FAILED: ${e.message}`);
            }
        }

    } catch (e) {
        console.error("Critical Error", e);
    }
}

listModels();
