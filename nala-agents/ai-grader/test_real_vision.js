
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGE_PATH = path.join(__dirname, 'public', 'ee2101_circuit.png');

async function testVision() {
    try {
        console.log("Reading image:", IMAGE_PATH);
        // Create a simple base64 image if file missing (fallback)
        let base64Image;
        if (fs.existsSync(IMAGE_PATH)) {
            const bitmap = fs.readFileSync(IMAGE_PATH);
            base64Image = "data:image/png;base64," + Buffer.from(bitmap).toString('base64');
        } else {
            console.warn("Warning: public/ee2101_circuit.png not found. Using placeholder.");
            base64Image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKwMTQAAAABJRU5ErkJggg==";
        }

        const payload = {
            userId: "tester",
            courseCode: "EE2101",
            inputBundle: {
                studentAnswer: "Testing Vision API",
                file: {
                    name: "test_image.png",
                    type: "image/png",
                    content: base64Image
                }
            }
        };

        console.log("Sending POST to http://localhost:3005/api/grade ...");
        const response = await fetch('http://localhost:3005/api/grade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("Response Status:", response.status);
        console.log("Grading Trace (Vision Analysis):");

        if (data.grade && data.grade.traceId) {
            // In a real scenario, we'd fetch the trace from DB, but let's check if the server printed logs or if we can infer from timing/feedback.
            // Wait, the response doesn't return the full trace body in my current implementation (only traceId).
            // However, verify success at least means no crash.
            // To be 100% sure, I'll check if the feedback mentions "Circuit diagram validated" which comes from the vision logic.
            console.log("Feedback:", data.grade.feedback);
        } else {
            console.log("Data:", data);
        }

    } catch (e) {
        console.error("Test Failed:", e);
    }
}

testVision();
