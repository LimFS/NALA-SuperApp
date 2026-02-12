
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/ai_grader'
});

const questions = [
    {
        id: "ee2101_q1",
        question_text: "Calculate the equivalent resistance of two 10-ohm resistors in parallel.",
        type: "text",
        answer_key: ["5", "5 ohms", "5Ω"],
        topic: "Resistive Circuits",
        difficulty: 1,
        max_score: 10
    },
    {
        id: "ee2101_q2",
        question_text: "In an Op-Amp circuit, what is the 'Virtual Short' concept?",
        type: "text",
        answer_key: ["voltage at inverting and non-inverting terminals are equal"],
        topic: "Op-Amps",
        difficulty: 2,
        max_score: 10
    },
    {
        id: "ee2101_q3",
        question_text: "Draw a simple inverting amplifier circuit with a gain of -10.",
        type: "file", // implies sketch/upload
        answer_key: ["inverting amplifier"],
        topic: "Op-Amps",
        difficulty: 3,
        max_score: 10
    },
    {
        id: "ee2101_q4",
        question_text: "Determine the time constant of an RC circuit with R=1kΩ and C=1μF.",
        type: "text",
        answer_key: ["1ms", "0.001s"],
        topic: "First Order Circuits",
        difficulty: 2,
        max_score: 10
    },
    {
        id: "ee2101_q5",
        question_text: "Explain Kirchhoff's Voltage Law.",
        type: "text",
        answer_key: ["sum of voltages in a loop is zero"],
        topic: "Circuit Laws",
        difficulty: 1,
        max_score: 10
    }
];

async function seed() {
    const client = await pool.connect();
    try {
        console.log("Seeding EE2101 Questions...");
        await client.query('BEGIN');

        // 1. Ensure Course Offering Exists (Optional, but good for foreign keys if we enforced them strictly)
        // await client.query("INSERT INTO course_offerings (course_code, academic_year, semester) VALUES ('EE2101', 'AY2025', 'Semester 2') ON CONFLICT DO NOTHING");

        for (const q of questions) {
            // upsert question
            await client.query(`
                INSERT INTO questions (id, question_id, course_code, academic_year, semester, question_set_name, is_visible)
                VALUES ($1, $1, 'EE2101', 'AY2025', 'Semester 2', 'Problem Set 1', true)
                ON CONFLICT (id) DO NOTHING
            `, [q.id]);

            // upsert version
            await client.query(`
                INSERT INTO question_versions (question_id, version_number, question_text, type, answer_key, difficulty, max_score)
                VALUES ($1, 1, $2, $3, $4, $5, $6)
                ON CONFLICT (question_id, version_number) DO UPDATE SET
                    question_text = EXCLUDED.question_text,
                    answer_key = EXCLUDED.answer_key
            `, [q.id, q.question_text, q.type, JSON.stringify(q.answer_key), q.difficulty, q.max_score]);
        }

        // Ensure Users Exist
        await client.query(`
            INSERT INTO users(user_id, email, first_name, last_name, role)
            VALUES('del_spooner', 'student@nala.ai', 'Del', 'Spooner', 'student'),
                ('user_123', 'test@nala.ai', 'Test', 'User', 'student')
            ON CONFLICT(email) DO NOTHING
        `);

        await client.query('COMMIT');
        console.log("Seeding Complete.");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Seeding Failed:", e);
    } finally {
        client.release();
        pool.end();
    }
}

seed();
