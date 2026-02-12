
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

// Use connection string from env or default to local/docker
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ai_grader',
    // ssl: { rejectUnauthorized: false } // Typical for AWS RDS
});

const initDB = async () => {
    const client = await pool.connect();
    try {
        console.log("[Repository PG] Initializing Database Schema (Hard Reset for Schema Alignment)...");

        // RESET: Drop tables in reverse dependency order
        await client.query('DROP TABLE IF EXISTS grading_traces');
        await client.query('DROP TABLE IF EXISTS questions');
        await client.query('DROP TABLE IF EXISTS question_sets');
        await client.query('DROP TABLE IF EXISTS course_manifests');
        // Do NOT drop student_question_attempts to preserve analytics if possible, 
        // OR drop it if we want full reset. For now, strict reset.
        // await client.query('DROP TABLE IF EXISTS student_question_attempts'); 

        // 1. Question Sets (ATAS Copy)
        await client.query(`
            CREATE TABLE IF NOT EXISTS question_sets (
                id SERIAL PRIMARY KEY,
                course_code TEXT NOT NULL,
                academic_year TEXT NOT NULL,
                semester TEXT NOT NULL,
                set_id INTEGER NOT NULL,
                name TEXT,
                sequence_order INTEGER DEFAULT 0,
                is_visible BOOLEAN DEFAULT true,
                deleted_at TIMESTAMP,
                UNIQUE(course_code, academic_year, semester, set_id)
            );
        `);

        // 2. Questions (ATAS + Extensions)
        await client.query(`
            CREATE TABLE IF NOT EXISTS questions (
                id TEXT PRIMARY KEY,
                question_id TEXT,
                course_code TEXT,
                academic_year TEXT,
                semester TEXT,
                set_id INTEGER,
                question_set_name TEXT,
                question_text TEXT,
                type TEXT DEFAULT 'text',
                options TEXT, -- JSON string
                answer_key TEXT, -- JSON string
                hint TEXT,
                explanation TEXT,
                media TEXT, -- JSON string
                difficulty INTEGER,
                context TEXT,
                deleted_at TIMESTAMP,
                -- AI Grader Extensions
                max_score DECIMAL DEFAULT 10.0,
                rubrics JSONB,
                FOREIGN KEY (course_code, academic_year, semester, set_id) REFERENCES question_sets(course_code, academic_year, semester, set_id)
            );
        `);

        // 3. Grading Traces (User-Aligned)
        await client.query(`
            CREATE TABLE IF NOT EXISTS grading_traces (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id TEXT,  -- Aligned with ATAS for joins
                udi TEXT NOT NULL,
                agent_id TEXT DEFAULT 'ANTI_GRAVITY',
                course_code TEXT NOT NULL,
                academic_year TEXT,
                semester TEXT,
                question_id TEXT, -- FK to questions
                set_id INTEGER,   -- Redundant but useful context
                input_bundle JSONB,
                score DECIMAL,
                max_score DECIMAL,
                grading_trace JSONB,
                embedding VECTOR(1536),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 4. Course Manifests (Dynamic Rules)
        await client.query(`
            CREATE TABLE IF NOT EXISTS course_manifests (
                course_code TEXT,
                academic_year TEXT,
                semester TEXT,
                title TEXT,
                grading_rules JSONB,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (course_code, academic_year, semester)
            );
        `);

        // 5. Student Question Attempts (Analytics Support)
        await client.query(`
            CREATE TABLE IF NOT EXISTS student_question_attempts (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL,
                course_code TEXT NOT NULL,
                question_id TEXT NOT NULL,
                set_id INTEGER,
                attempt_count INTEGER DEFAULT 1,
                is_correct BOOLEAN DEFAULT false,
                last_attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, course_code, question_id)
            );
        `);

        // 6. Seed Manifest
        const { rows: manRows } = await client.query(
            "SELECT count(*) FROM course_manifests WHERE course_code = $1 AND academic_year = $2 AND semester = $3",
            ['EE2101', '2025', '2']
        );

        if (parseInt(manRows[0].count) === 0) {
            console.log("[Repository PG] Seeding EE2101 Course Manifest (2025/2)...");
            const rules = JSON.stringify({
                strictness: "high",
                allow_partial_credit: true,
                required_steps: ["formula", "substitution", "final_answer"],
                grade_precision: 0.5
            });
            await client.query(
                "INSERT INTO course_manifests (course_code, academic_year, semester, title, grading_rules) VALUES ($1, $2, $3, $4, $5)",
                ['EE2101', '2025', '2', 'Circuit Analysis & Design', rules]
            );
        }

        // 7. Seed Question Sets & Questions
        const { rows: setRows } = await client.query(
            "SELECT count(*) FROM question_sets WHERE course_code = $1 AND academic_year = $2",
            ['EE2101', '2025']
        );

        if (parseInt(setRows[0].count) === 0) {
            console.log("[Repository PG] Seeding EE2101 Sets & Questions...");

            // Sets
            const sets = [
                { id: 1, name: 'Basic Circuits', order: 1 },
                { id: 2, name: 'AC Analysis', order: 2 }
            ];

            for (const s of sets) {
                await client.query(
                    `INSERT INTO question_sets (course_code, academic_year, semester, set_id, name, sequence_order)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    ['EE2101', '2025', '2', s.id, s.name, s.order]
                );
            }

            // Questions
            const qEE = [
                ['EE2101', 1, "What does Kirchhoff's Current Law (KCL) state?", 'text', null, JSON.stringify(["sum", "entering", "leaving", "zero"]), "Conservation of charge.", "Sum entering = Sum leaving.", null, 1, "KCL"],
                ['EE2101', 1, "Calculate equivalent resistance of two 10-ohm resistors in parallel.", 'text', null, JSON.stringify(["5", "5 ohm"]), "Product over Sum.", "5 Ohms.", null, 1, "Resistor Circuits"],
                ['EE2101', 1, "True or False: Voltage across parallel components is the same.", 'mcq', JSON.stringify(["True", "False"]), JSON.stringify(["True"]), "Parallel definition.", "True.", null, 1, "Circuit Properties"],
                ['EE2101', 2, "What is the impedance of a capacitor?", 'text', null, JSON.stringify(["1/jwC", "-j/wC"]), "Frequency dependent.", "1/(jwc)", null, 2, "Impedance"]
            ];

            for (let i = 0; i < qEE.length; i++) {
                const q = qEE[i];
                const uuid = `EE2101_2025_2_S${q[1]}_Q${i + 1}`;
                await client.query(`
                    INSERT INTO questions (
                        id, question_id, course_code, academic_year, semester, set_id, question_set_name, 
                        question_text, type, options, answer_key, hint, explanation, media, difficulty, context,
                        max_score, rubrics
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                `, [
                    uuid, String(i + 1), 'EE2101', '2025', '2', q[1],
                    q[1] === 1 ? 'Basic Circuits' : 'AC Analysis',
                    q[2], q[3], q[4], q[5], q[6], q[7], q[8], q[9], q[10],
                    10.0, JSON.stringify({ keywords: ["circuit", "voltage"] }) // Default Rubric
                ]);
            }
        }

    } catch (err) {
        console.error("[Repository PG] Init Error:", err);
    } finally {
        client.release();
    }
};

// --- DATA ACCESS METHODS ---

const getManifest = async (courseCode) => {
    const { rows } = await pool.query("SELECT * FROM course_manifests WHERE course_code = $1", [courseCode]);
    return rows[0] ? { ...rows[0], grading_rules: rows[0].grading_rules } : null; // pg automatically parses JSON
};

const getQuestions = async (courseCode, academicYear = '2025', semester = '2') => {
    // Join with Sets to ensure correct ordering and context
    const query = `
        SELECT q.*, qs.name as set_name, qs.sequence_order 
        FROM questions q
        JOIN question_sets qs ON q.set_id = qs.set_id 
             AND q.course_code = qs.course_code 
             AND q.academic_year = qs.academic_year 
             AND q.semester = qs.semester
        WHERE q.course_code = $1 
          AND q.academic_year = $2 
          AND q.semester = $3 
          AND q.deleted_at IS NULL
        ORDER BY qs.sequence_order, q.question_id
    `;
    const { rows } = await pool.query(query, [courseCode, academicYear, semester]);
    return rows;
};

const saveGradingRecord = async (record) => {
    const {
        id, udi, user_id,
        course_code, academic_year, semester,
        question_id, set_id,
        input_bundle, score, max_score, grading_trace
    } = record;

    const query = `
        INSERT INTO grading_traces (
            id, udi, user_id, 
            course_code, academic_year, semester, 
            question_id, set_id,
            input_bundle, score, max_score, grading_trace
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id;
    `;
    const values = [
        id, udi, user_id,
        course_code, academic_year, semester,
        question_id, set_id,
        input_bundle, score, max_score, grading_trace
    ];
    const { rows } = await pool.query(query, values);
    return rows[0].id;
};

// --- PROGRESS / ANALYTICS ---
const saveAttempt = async (attempt) => {
    const { user_id, course_code, question_id, set_id, is_correct } = attempt;
    const query = `
        INSERT INTO student_question_attempts (user_id, course_code, question_id, set_id, is_correct, attempt_count, last_attempted_at)
        VALUES ($1, $2, $3, $4, $5, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, course_code, question_id) 
        DO UPDATE SET 
            attempt_count = student_question_attempts.attempt_count + 1,
            is_correct = EXCLUDED.is_correct,
            last_attempted_at = CURRENT_TIMESTAMP
    `;
    await pool.query(query, [user_id, course_code, question_id, set_id, is_correct]);
};

// Legacy Compatibility (UI Requirement) -> Redirects to new strict getter
const getProgress = async (userId, courseCode, academicYear, semester) => {
    return null; // Legacy stub
};

export default {
    initDB,
    getManifest,
    saveGradingRecord,
    saveAttempt,
    getQuestions,
    getProgress
};
