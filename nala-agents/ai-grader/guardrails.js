
/**
 * Anti-Gravity Guardrails
 * Defensive Layer for AI Input Processing
 */

const BLOCKED_PHRASES = [
    "ignore all previous instructions",
    "ignore previous instructions",
    "forget all instructions",
    "you are now",
    "system override",
    "developer mode",
    "jailbreak"
];

export const scanForInjection = (text) => {
    if (!text) return { safe: true };

    const normalized = text.toLowerCase();
    for (const phrase of BLOCKED_PHRASES) {
        if (normalized.includes(phrase)) {
            return {
                safe: false,
                reason: `Potential Prompt Injection Detected: "${phrase}"`
            };
        }
    }
    return { safe: true };
};

export const sanitizeInput = (inputBundle) => {
    // 1. Check Text
    if (inputBundle.studentAnswer) {
        const check = scanForInjection(inputBundle.studentAnswer);
        if (!check.safe) return check;
    }

    // 2. Check File Name (Basic)
    if (inputBundle.file && inputBundle.file.name) {
        if (inputBundle.file.name.includes("..") || inputBundle.file.name.includes("/")) {
            return { safe: false, reason: "Invalid File Name (Path Traversal)" };
        }
    }

    return { safe: true };
};
