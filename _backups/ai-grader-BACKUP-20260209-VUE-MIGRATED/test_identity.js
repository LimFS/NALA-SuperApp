
import { generateUDI } from './udi.js';

console.log("--- Identity Resolution Test ---");

const testCases = [
    { user: 'del_spooner', course: 'EE2101', expected: 'UDI-8829-XJ-2026' },
    { user: 'Del Spooner', course: 'EE2101', expected: 'UDI-8829-XJ-2026' },
    { user: 'u12345', course: 'EE2101', expectedPattern: /^UDI-[0-9A-F]{4}-EE2101-2025$/ }
];

testCases.forEach(tc => {
    const result = generateUDI(tc.user, tc.course, 'AY2025');

    if (tc.expected) {
        if (result === tc.expected) {
            console.log(`[PASS] ${tc.user} -> ${result}`);
        } else {
            console.error(`[FAIL] ${tc.user} -> Expected ${tc.expected}, got ${result}`);
        }
    } else if (tc.expectedPattern) {
        if (tc.expectedPattern.test(result)) {
            console.log(`[PASS] ${tc.user} -> ${result} (Matches Pattern)`);
        } else {
            console.error(`[FAIL] ${tc.user} -> ${result} (Pattern Mismatch)`);
        }
    }
});
