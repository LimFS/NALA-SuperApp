
import { dbAdapter } from './src/modules/db-adapter.js';

const initDB = async () => {
    console.log("[Repository] Initializing Database Schema (via Adapter)...");

    // RESET: Drop tables
    await dbAdapter.query('DROP TABLE IF EXISTS grading_traces');
    await dbAdapter.query('DROP TABLE IF EXISTS grading_records');
    await dbAdapter.query('DROP TABLE IF EXISTS questions');
    await dbAdapter.query('DROP TABLE IF EXISTS question_sets');
    await dbAdapter.query('DROP TABLE IF EXISTS course_manifests');

    // 1. Student Progress
    await dbAdapter.query(`CREATE TABLE IF NOT EXISTS student_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        course_code TEXT,
        academic_year TEXT,
        semester TEXT,
        current_set_id INTEGER,
        current_difficulty INTEGER,
        last_active_question_id INTEGER,
        data TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, course_code, academic_year, semester)
    )`);

    // 2. Question Sets
    await dbAdapter.query(`CREATE TABLE IF NOT EXISTS question_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_code TEXT NOT NULL,
        academic_year TEXT NOT NULL,
        semester TEXT NOT NULL,
        set_id INTEGER NOT NULL,
        name TEXT,
        sequence_order INTEGER DEFAULT 0,
        is_visible BOOLEAN DEFAULT 1,
        deleted_at DATETIME,
        UNIQUE(course_code, academic_year, semester, set_id)
    )`);

    // 3. Questions
    await dbAdapter.query(`CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        question_id TEXT,
        course_code TEXT,
        academic_year TEXT,
        semester TEXT,
        set_id INTEGER,
        question_set_name TEXT,
        question_text TEXT,
        type TEXT DEFAULT 'text',
        options TEXT,
        answer_key TEXT,
        hint TEXT,
        explanation TEXT,
        media TEXT,
        difficulty INTEGER,
        context TEXT,
        deleted_at DATETIME,
        max_score DECIMAL DEFAULT 10.0,
        rubrics JSONB,
        FOREIGN KEY (set_id) REFERENCES question_sets(set_id)
    )`);

    // 4. Grading Traces
    await dbAdapter.query(`CREATE TABLE IF NOT EXISTS grading_traces (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        udi TEXT NOT NULL,
        agent_id TEXT DEFAULT 'ANTI_GRAVITY',
        course_code TEXT NOT NULL,
        academic_year TEXT,
        semester TEXT,
        question_id TEXT,
        set_id INTEGER,
        input_bundle JSONB,
        score DECIMAL,
        max_score DECIMAL,
        grading_trace JSONB,
        embedding BLOB,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 5. Course Manifests
    await dbAdapter.query(`CREATE TABLE IF NOT EXISTS course_manifests (
        course_code TEXT,
        academic_year TEXT,
        semester TEXT,
        title TEXT,
        grading_rules JSONB,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (course_code, academic_year, semester)
    )`);

    // 6. Student Attempts
    await dbAdapter.query(`CREATE TABLE IF NOT EXISTS student_question_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        course_code TEXT NOT NULL,
        question_id TEXT NOT NULL,
        set_id INTEGER,
        attempt_count INTEGER DEFAULT 1,
        is_correct BOOLEAN DEFAULT 0,
        last_attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, course_code, question_id)
    )`);

    await seedManifest();
};

const seedManifest = async () => {
    // Check if seeded
    const row = await dbAdapter.get("SELECT count(*) as count FROM course_manifests WHERE course_code = 'EE2101' AND academic_year = '2025'");

    if (!row || row.count === 0) {
        console.log("[Repository] Seeding EE2101 Manifest (2025)...");
        const rules = JSON.stringify({
            strictness: "high",
            allow_partial_credit: true,
            required_steps: ["formula", "substitution", "final_answer"],
            grade_precision: 0.5
        });
        await dbAdapter.query("INSERT INTO course_manifests (course_code, academic_year, semester, title, grading_rules) VALUES (?, ?, ?, ?, ?)",
            ['EE2101', '2025', '2', 'Circuit Analysis & Design', rules]);
    }

    // Seed Sets & Questions
    const setRow = await dbAdapter.get("SELECT count(*) as count FROM question_sets WHERE course_code = 'EE2101' AND academic_year = '2025'");

    if (setRow && setRow.count === 0) {
        console.log("[Repository] Seeding EE2101 Sets & Questions...");

        const sets = [
            { id: 1, name: 'Basic Circuits', order: 1 },
            { id: 2, name: 'AC Analysis', order: 2 }
        ];

        for (const s of sets) {
            await dbAdapter.query("INSERT INTO question_sets (course_code, academic_year, semester, set_id, name, sequence_order) VALUES (?, ?, ?, ?, ?, ?)",
                ['EE2101', '2025', '2', s.id, s.name, s.order]);
        }

        const qEE = [
            ['EE2101', 1, "What does Kirchhoff's Current Law (KCL) state?", 'text', null, JSON.stringify(["sum", "entering", "leaving", "zero"]), "Conservation of charge.", "Sum entering = Sum leaving.", null, 1, "KCL"],
            ['EE2101', 1, "Calculate equivalent resistance of two 10-ohm resistors in parallel.", 'text', null, JSON.stringify(["5", "5 ohm"]), "Product over Sum.", "5 Ohms.", null, 1, "Resistor Circuits"],
            ['EE2101', 1, "True or False: Voltage across parallel components is the same.", 'mcq', JSON.stringify(["True", "False"]), JSON.stringify(["True"]), "Parallel definition.", "True.", null, 1, "Circuit Properties"],
            ['EE2101', 2, "What is the impedance of a capacitor?", 'text', null, JSON.stringify(["1/jwC", "-j/wC"]), "Frequency dependent.", "1/(jwc)", null, 2, "Impedance"]
        ];

        for (const [i, q] of qEE.entries()) {
            const uuid = `EE2101_2025_2_S${q[1]}_Q${i + 1}`;
            await dbAdapter.query(`INSERT INTO questions (
                id, question_id, course_code, academic_year, semester, set_id, question_set_name, 
                question_text, type, options, answer_key, hint, explanation, media, difficulty, context,
                max_score, rubrics
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    uuid, String(i + 1), 'EE2101', '2025', '2', q[1],
                    q[1] === 1 ? 'Basic Circuits' : 'AC Analysis',
                    q[2], q[3], q[4], q[5], q[6], q[7], q[8], q[9], q[10],
                    10.0, JSON.stringify({ keywords: ["circuit", "voltage"] })
                ]);
        }
    }
};

const getQuestions = (courseCode, academicYear = '2025', semester = '2') => {
    return dbAdapter.query(`
        SELECT q.*, qs.name as set_name, qs.sequence_order 
        FROM questions q
        JOIN question_sets qs ON q.set_id = qs.set_id 
                AND q.course_code = qs.course_code 
                AND q.academic_year = qs.academic_year 
                AND q.semester = qs.semester
        WHERE q.course_code = ? 
            AND q.academic_year = ? 
            AND q.semester = ? 
            AND q.deleted_at IS NULL
        ORDER BY qs.sequence_order, q.question_id
    `, [courseCode, academicYear, semester]);
};

const getProgress = (userId, courseCode, academicYear, semester) => {
    return dbAdapter.get("SELECT * FROM student_progress WHERE user_id = ? AND course_code = ? AND academic_year = ? AND semester = ?",
        [userId, courseCode, academicYear, semester]);
};

const saveGradingRecord = (record) => {
    const {
        id, udi, user_id,
        course_code, academic_year, semester,
        question_id, set_id,
        input_bundle, score, max_score, grading_trace
    } = record;

    return dbAdapter.query(`INSERT INTO grading_traces (
            id, udi, user_id, 
            course_code, academic_year, semester, 
            question_id, set_id,
            input_bundle, score, max_score, grading_trace
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, json(?), ?, ?, json(?))`,
        [
            id, udi, user_id,
            course_code, academic_year, semester,
            question_id, set_id,
            JSON.stringify(input_bundle), score, max_score, JSON.stringify(grading_trace)
        ]).then(res => res.lastID);
};

const saveAttempt = (attempt) => {
    const { user_id, course_code, question_id, set_id, is_correct } = attempt;
    return dbAdapter.query(`INSERT INTO student_question_attempts (user_id, course_code, question_id, set_id, is_correct, attempt_count, last_attempted_at)
    VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, course_code, question_id) 
    DO UPDATE SET 
        attempt_count = attempt_count + 1,
        is_correct = excluded.is_correct,
        last_attempted_at = CURRENT_TIMESTAMP`,
        [user_id, course_code, question_id, set_id, is_correct ? 1 : 0]).then(res => res.lastID);
};

const getManifest = (courseCode) => {
    return dbAdapter.get("SELECT * FROM course_manifests WHERE course_code = ?", [courseCode])
        .then(row => row ? { ...row, grading_rules: JSON.parse(row.grading_rules || '{}') } : null);
};

export default {
    initDB,
    getManifest,
    getQuestions,
    getProgress,
    saveGradingRecord,
    saveAttempt
};
