/**
 * Question Generator Module
 * Emulating AI Generation based on Bloom's Taxonomy
 */

const BLOOM_TAXONOMY = {
    REMEMBER: { verbs: ["Define", "List", "State", "Recall"], difficulty: 1 },
    UNDERSTAND: { verbs: ["Explain", "Describe", "Summarize", "Interpret"], difficulty: 2 },
    APPLY: { verbs: ["Calculate", "Solve", "Demonstrate", "Use"], difficulty: 3 },
    ANALYZE: { verbs: ["Compare", "Analyze", "Differentiate", "Examine"], difficulty: 4 },
    EVALUATE: { verbs: ["Assess", "Judge", "Critique", "Defend"], difficulty: 5 },
    CREATE: { verbs: ["Design", "Construct", "Formulate", "Develop"], difficulty: 5 }
};

const TEMPLATES = {
    "circuit": [
        { level: "REMEMBER", text: "Define the term '{concept}' in the context of circuit analysis." },
        { level: "UNDERSTAND", text: "Explain why {concept} is important in AC circuits." },
        { level: "APPLY", text: "Calculate the total {concept} of two components in series." },
        { level: "ANALYZE", text: "Analyze the effect of increasing frequency on {concept}." },
        { level: "EVALUATE", text: "Critique the use of {concept} in high-frequency applications." }
    ]
};

const TOPICS = {
    "EE2101": ["Impedance", "Resonance", "Power Factor", "Phasors", "Kirchhoff's Laws"]
};

/**
 * Generates a set of questions based on topic and taxonomy.
 * @param {string} courseCode 
 * @param {string} academicYear 
 * @param {string} semester 
 * @param {number} count 
 * @returns {Array} Array of Question Objects
 */
export const generateQuestions = (courseCode, academicYear, semester, count = 5) => {
    const questions = [];
    const topics = TOPICS[courseCode] || ["Generic Circuit Theory"];

    for (let i = 0; i < count; i++) {
        const topic = topics[i % topics.length];
        const taxonomyKeys = Object.keys(BLOOM_TAXONOMY);
        const levelKey = taxonomyKeys[i % taxonomyKeys.length];
        const taxonomy = BLOOM_TAXONOMY[levelKey];

        // Select Template or Generic
        const templateList = TEMPLATES["circuit"];
        const template = templateList.find(t => t.level === levelKey) || { text: `${taxonomy.verbs[0]} the concept of {concept}.` };

        const qText = template.text.replace("{concept}", topic);
        const qId = `${courseCode}_${academicYear}_S${semester}_GEN_${Date.now()}_${i}`;

        questions.push({
            id: qId,
            question_id: `GEN-${i + 1}`,
            course_code: courseCode,
            academic_year: academicYear,
            semester: semester,
            set_id: 99, // Generated Set
            question_set_name: `Generated: ${levelKey}`,
            question_text: qText,
            type: 'text',
            options: null,
            answer_key: JSON.stringify(["keyword1", "keyword2"]),
            hint: `Think about ${topic} in terms of ${levelKey.toLowerCase()}.`,
            explanation: `This question tests your ability to ${taxonomy.verbs[0].toLowerCase()} ${topic}.`,
            media: null,
            difficulty: taxonomy.difficulty,
            context: `${levelKey} - ${topic}`,
            max_score: 10,
            rubrics: JSON.stringify({ keywords: [topic.toLowerCase()] })
        });
    }
    return questions;
};

export default { generateQuestions };
