
import { aiGateway } from './src/modules/AIGateway.js';

const runTest = async () => {
    console.log("Testing AI Gateway Connection...");
    try {
        const result = await aiGateway.generateJSON(
            "What is 2+2? Return strictly JSON with { answer: number, explanation: string }"
        );
        console.log("Success! Result:", result);
    } catch (e) {
        console.error("Failure:", e);
    }
};

runTest();
