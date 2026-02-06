import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'atas.db');

const db = new sqlite3.Database(DB_PATH);

// Scalability Optimization: Enable Write-Ahead Logging (WAL)
db.configure('busyTimeout', 5000);
db.exec('PRAGMA journal_mode = WAL;');

const initDB = () => {
    db.serialize(() => {
        // 1. Student Progress
        db.run(`CREATE TABLE IF NOT EXISTS student_progress (
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

        // 2. Questions
        db.run(`CREATE TABLE IF NOT EXISTS questions (
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
            context TEXT
        )`);

        // 3. Analytics
        db.run(`CREATE TABLE IF NOT EXISTS student_question_attempts (
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

        // 4. Config
        db.run(`CREATE TABLE IF NOT EXISTS course_offerings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_code TEXT NOT NULL,
            course_name TEXT NOT NULL,
            academic_year TEXT NOT NULL,
            semester TEXT NOT NULL,
            is_active BOOLEAN DEFAULT 0
        )`);

        // 5. User Access Roles (RBAC)
        db.run(`CREATE TABLE IF NOT EXISTS user_access_roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'faculty', 'student')),
            course_code TEXT NOT NULL,
            academic_year TEXT NOT NULL,
            semester TEXT NOT NULL,
            UNIQUE(user_id, course_code, academic_year, semester)
        )`);

        // 6. Question Sets (Sequence & Metadata)
        db.run(`CREATE TABLE IF NOT EXISTS question_sets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_code TEXT NOT NULL,
            academic_year TEXT NOT NULL,
            semester TEXT NOT NULL,
            set_id INTEGER NOT NULL,
            name TEXT,
            sequence_order INTEGER DEFAULT 0,
            is_visible BOOLEAN DEFAULT 1,
            UNIQUE(course_code, academic_year, semester, set_id)
        )`);

        // Seed Default Config
        db.get("SELECT count(*) as count FROM course_offerings", (err, row) => {
            if (!err && row.count === 0) {
                console.log("[Repo] Seeding default course config...");
                db.run(`INSERT INTO course_offerings (course_code, course_name, academic_year, semester, is_active) 
                        VALUES ('MH1810', 'Mathematics 2', 'AY2025', 'Semester 2', 1)`);
            }
        });

        // MIGRATION: Add columns to course_offerings if missing
        const columnsToAdd = [
            { name: 'icon_url', type: 'TEXT' },
            { name: 'prompt_template', type: 'TEXT' },
            { name: 'model_config', type: 'TEXT' }, // JSON { model: 'gemini-1.5', temp: 0.7 }
            { name: 'api_key', type: 'TEXT' }, // Encrypted or plain (for prototype)
            { name: 'deleted_at', type: 'DATETIME' } // Soft Delete
        ];

        columnsToAdd.forEach(col => {
            db.run(`ALTER TABLE course_offerings ADD COLUMN ${col.name} ${col.type}`, (err) => { });
        });

        // MIGRATION: Soft Delete for Questions and Sets
        db.run(`ALTER TABLE questions ADD COLUMN deleted_at DATETIME`, (err) => { });
        db.run(`ALTER TABLE question_sets ADD COLUMN deleted_at DATETIME`, (err) => { });

        // SEED FACULTY (Mock)
        db.run(`
            INSERT OR IGNORE INTO user_access_roles (user_id, role, course_code, academic_year, semester)
            VALUES ('uuid-hal', 'faculty', 'MH1810', 'AY2025', 'Semester 2')
        `);

        // SEED DEFAULT SETS & QUESTIONS (If Empty)
        db.get("SELECT count(*) as count FROM question_sets", (err, row) => {
            if (!err && row.count === 0) {
                console.log("[Repo] Seeding default Sets...");
                const sets = [
                    { id: 1, name: 'Module 1: Fundamentals', order: 1 },
                    { id: 2, name: 'Module 2: Vectors & Linear Algebra', order: 2 }
                ];
                sets.forEach(s => {
                    db.run(`INSERT INTO question_sets (course_code, academic_year, semester, set_id, name, sequence_order, is_visible)
                            VALUES ('MH1810', 'AY2025', 'Semester 2', ?, ?, ?, 1)`, [s.id, s.name, s.order]);
                });
            }
        });

        db.get("SELECT count(*) as count FROM questions", (err, row) => {
            if (!err && row.count === 0) {
                console.log("[Repo] Seeding default Questions...");
                const questions = [
                    // SET 1: Calculus
                    { id: 'q1', text: 'Find the derivative of f(x) = x^2.', type: 'text', diff: 1, set: 1 },
                    { id: 'q2', text: 'Evaluate the integral of 2x dx.', type: 'mcq', diff: 1, set: 1, options: ['x^2 + C', '2x + C', 'x^2', '2x^2 + C'], answer: ['x^2 + C'] },
                    { id: 'q3', text: 'What is the limit of (sin x)/x as x approaches 0?', type: 'text', diff: 2, set: 1 },
                    // SET 2: Vectors
                    { id: 'q11', text: 'Compute the dot product of (1, 2) and (3, 4).', type: 'text', diff: 2, set: 2 },
                    { id: 'q12', text: 'Find the cross product of i and j.', type: 'mcq', diff: 2, set: 2, options: ['k', '-k', '0', '1'], answer: ['k'] }
                ];

                questions.forEach(q => {
                    const stmt = `INSERT INTO questions (id, question_id, course_code, academic_year, semester, set_id, question_text, type, options, answer_key, difficulty) 
                                  VALUES (?, ?, 'MH1810', 'AY2025', 'Semester 2', ?, ?, ?, ?, ?, ?)`;
                    db.run(stmt, [
                        q.id, q.id.toUpperCase(), q.set, q.text, q.type,
                        q.options ? JSON.stringify(q.options) : null,
                        q.answer ? JSON.stringify(q.answer) : null,
                        q.diff
                    ]);
                });
            }
        });
    });
};

/**
 * Get Questions for a Course filtered by Academic Context and optional Set ID.
 * Returns questions sorted by Difficulty (ASC) -> ID (Natural Sort).
 */
const getQuestions = (courseCode, academicYear, semester, setId = null) => {
    return new Promise((resolve, reject) => {
        let sql = "SELECT * FROM questions WHERE course_code = ? AND academic_year = ? AND semester = ? AND deleted_at IS NULL";
        const params = [courseCode, academicYear, semester];

        if (setId) {
            sql += " AND set_id = ?";
            params.push(Number(setId)); // Ensure number
        }

        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);

            // Transform for Frontend
            const questions = rows.map(q => ({
                ...q,
                options: q.options ? JSON.parse(q.options) : null,
                answerKey: q.answer_key ? JSON.parse(q.answer_key) : [],
                media: q.media ? JSON.parse(q.media) : null,
                // Ensure numbers
                difficulty: Number(q.difficulty) || 1,
                set_id: Number(q.set_id) || 1
            }));

            // Modular Sorting Logic: Difficulty ASC -> ID Natural Sort
            questions.sort((a, b) => {
                if (a.difficulty !== b.difficulty) {
                    return a.difficulty - b.difficulty;
                }
                return (a.id || '').localeCompare(b.id || '', undefined, { numeric: true });
            });

            resolve(questions);
        });
    });
};

// --- FACULTY METHODS ---

const getUserRole = (userId, courseCode, academicYear, semester) => {
    return getResult(
        "SELECT role FROM user_access_roles WHERE user_id = ? AND course_code = ? AND academic_year = ? AND semester = ?",
        [userId, courseCode, academicYear, semester]
    );
};

const updateCourseConfig = (courseCode, academicYear, semester, config) => {
    const { iconUrl, promptTemplate, modelConfig, apiKey } = config;
    return runQuery(
        `UPDATE course_offerings SET 
            icon_url = COALESCE(?, icon_url),
            prompt_template = COALESCE(?, prompt_template),
            model_config = COALESCE(?, model_config),
            api_key = COALESCE(?, api_key)
        WHERE course_code = ? AND academic_year = ? AND semester = ?`,
        [iconUrl, promptTemplate, JSON.stringify(modelConfig), apiKey, courseCode, academicYear, semester]
    );
};

const getSets = (courseCode, academicYear, semester) => {
    return new Promise((resolve, reject) => {
        db.all(
            "SELECT * FROM question_sets WHERE course_code = ? AND academic_year = ? AND semester = ? AND deleted_at IS NULL ORDER BY sequence_order ASC",
            [courseCode, academicYear, semester],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
};

const getQuestionStats = (courseCode, academicYear, semester) => {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT question_id, 
                   COUNT(*) as total_attempts, 
                   AVG(is_correct) as success_rate,
                   AVG(attempt_count) as avg_tries
            FROM student_question_attempts 
            WHERE course_code = ?
            GROUP BY question_id
        `;
        db.all(sql, [courseCode], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// --- SETS MANAGEMENT ---
const upsertSet = (courseCode, academicYear, semester, set) => {
    const { setId, name, isVisible, sequenceOrder } = set;
    return runQuery(
        `INSERT INTO question_sets (course_code, academic_year, semester, set_id, name, is_visible, sequence_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(course_code, academic_year, semester, set_id) 
         DO UPDATE SET name=excluded.name, is_visible=excluded.is_visible, sequence_order=excluded.sequence_order`,
        [courseCode, academicYear, semester, setId, name, isVisible ? 1 : 0, sequenceOrder]
    );
};

const deleteSet = (courseCode, academicYear, semester, setId) => {
    return runQuery(
        "UPDATE question_sets SET deleted_at = CURRENT_TIMESTAMP WHERE course_code = ? AND academic_year = ? AND semester = ? AND set_id = ?",
        [courseCode, academicYear, semester, setId]
    );
};

// --- STUDENT PROGRESS ---
const saveProgress = (userId, courseCode, academicYear, semester, progress) => {
    const { currentSetId, currentDifficulty, lastActiveQuestionId, data } = progress;
    // data is assumed to be stringified JSON from frontend
    return runQuery(
        `INSERT INTO student_progress (user_id, course_code, academic_year, semester, current_set_id, current_difficulty, last_active_question_id, data, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id, course_code, academic_year, semester) 
         DO UPDATE SET 
            current_set_id = excluded.current_set_id,
            current_difficulty = excluded.current_difficulty,
            last_active_question_id = excluded.last_active_question_id,
            data = excluded.data,
            updated_at = CURRENT_TIMESTAMP`,
        [userId, courseCode, academicYear, semester, currentSetId, currentDifficulty, lastActiveQuestionId, data]
    );
};

const getProgress = (userId, courseCode, academicYear, semester) => {
    return getResult(
        "SELECT * FROM student_progress WHERE user_id = ? AND course_code = ? AND academic_year = ? AND semester = ?",
        [userId, courseCode, academicYear, semester]
    );
};

// --- QUESTIONS MANAGEMENT ---
const upsertQuestion = (q) => {
    // Destructure with fallbacks for camelCase/snake_case mismatch
    const id = q.id;
    const questionId = q.questionId || q.question_id;
    const courseCode = q.courseCode || q.course_code;
    const academicYear = q.academicYear || q.academic_year;
    const semester = q.semester;
    const setId = q.setId || q.set_id;
    const questionSetName = q.questionSetName || q.question_set_name;
    const questionText = q.questionText || q.question_text;
    const type = q.type || 'text';
    const options = q.options; // Assumed Object/Array
    const answerKey = q.answerKey || q.answer_key; // Assumed Object/Array
    const hint = q.hint;
    const explanation = q.explanation;
    const media = q.media; // Assumed Object
    const difficulty = q.difficulty;
    const context = q.context;

    return runQuery(
        `INSERT INTO questions (
            id, question_id, course_code, academic_year, semester, 
            set_id, question_set_name, question_text, type, options, 
            answer_key, hint, explanation, media, difficulty, context
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            question_text = excluded.question_text,
            type = excluded.type,
            options = excluded.options,
            answer_key = excluded.answer_key,
            hint = excluded.hint,
            explanation = excluded.explanation,
            media = excluded.media,
            difficulty = excluded.difficulty,
            context = excluded.context,
            set_id = excluded.set_id
        `,
        [
            id, questionId, courseCode, academicYear, semester,
            setId, questionSetName, questionText, type,
            // Safety checks for stringify to avoid double-stringification if already string
            (typeof options === 'string') ? options : JSON.stringify(options || []),
            (typeof answerKey === 'string') ? answerKey : JSON.stringify(answerKey || []),
            hint, explanation,
            (typeof media === 'string') ? media : JSON.stringify(media || {}),
            difficulty, context
        ]
    );
};

const deleteQuestion = (id) => {
    return runQuery("UPDATE questions SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);
};

// Expose other DB methods as needed
const getResult = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const runQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

export default {
    db,
    initDB,
    getQuestions,
    get: getResult,
    run: runQuery,
    getUserRole,
    updateCourseConfig,
    getSets,
    upsertSet,
    deleteSet,
    upsertQuestion,
    deleteQuestion,
    deleteQuestion,
    getQuestionStats,
    saveProgress,
    getProgress
};
