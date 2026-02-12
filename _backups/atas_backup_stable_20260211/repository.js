import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

import { dirname, join } from 'path';
import { encrypt, encryptDeterministic, decrypt } from './src/utils/crypto.js'; // Encryption Utility

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
            difficulty INTEGER,
            context TEXT,
            sequence_order INTEGER DEFAULT 0,
            deleted_at DATETIME
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
            is_active BOOLEAN DEFAULT 0,
            icon_url TEXT,
            prompt_template TEXT,
            model_config TEXT,
            api_key TEXT,
            deleted_at DATETIME
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
            deleted_at DATETIME,
            UNIQUE(course_code, academic_year, semester, set_id)
        )`);

        // Initialize / Seed
        // MIGRATION: Add columns to course_offerings if missing (Safe-check for existing non-deleted DBs)
        const columnsToAdd = [
            { table: 'course_offerings', name: 'icon_url', type: 'TEXT' },
            { table: 'course_offerings', name: 'prompt_template', type: 'TEXT' },
            { table: 'course_offerings', name: 'model_config', type: 'TEXT' },
            { table: 'user_access_roles', name: 'email', type: 'TEXT' },
            { table: 'course_offerings', name: 'api_key', type: 'TEXT' },
            { table: 'course_offerings', name: 'deleted_at', type: 'DATETIME' },
            { table: 'course_offerings', name: 'api_key', type: 'TEXT' },
            { table: 'course_offerings', name: 'deleted_at', type: 'DATETIME' },
            { table: 'questions', name: 'deleted_at', type: 'DATETIME' },
            { table: 'questions', name: 'sequence_order', type: 'INTEGER DEFAULT 0' },
            { table: 'question_sets', name: 'deleted_at', type: 'DATETIME' },
            { table: 'question_sets', name: 'created_at', type: 'DATETIME' },
            { table: 'question_sets', name: 'updated_at', type: 'DATETIME' },
            { table: 'question_sets', name: 'created_by', type: 'TEXT' },
            { table: 'question_sets', name: 'updated_by', type: 'TEXT' }
        ];

        columnsToAdd.forEach(col => {
            db.run(`ALTER TABLE ${col.table} ADD COLUMN ${col.name} ${col.type}`, (err) => {
                // Ignore "duplicate column name" errors
            });
        });

        // ... (skipping) ...

        // --- SETS MANAGEMENT ---
        const upsertSet = (courseCode, academicYear, semester, set, userEmail) => {
            // Destructure with support for both camelCase (internal) and snake_case (DB/Frontend)
            const setId = set.setId || set.set_id;
            const name = set.name;
            // Check for undefined explicitly because isVisible can be false (0)
            const isVisible = (set.isVisible !== undefined) ? set.isVisible : set.is_visible;
            const sequenceOrder = set.sequenceOrder || set.sequence_order;

            return runQuery(
                `INSERT INTO question_sets (course_code, academic_year, semester, set_id, name, is_visible, sequence_order, created_by, updated_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT(course_code, academic_year, semester, set_id) 
         DO UPDATE SET 
            name=excluded.name, 
            is_visible=excluded.is_visible, 
            sequence_order=excluded.sequence_order,
            updated_by=excluded.updated_by,
            updated_at=CURRENT_TIMESTAMP`,
                [courseCode, academicYear, semester, setId, name, isVisible ? 1 : 0, sequenceOrder, userEmail, userEmail]
            );
        };

        // 7. Course Config History (Versioning)
        db.run(`CREATE TABLE IF NOT EXISTS course_config_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_code TEXT,
            academic_year TEXT,
            semester TEXT,
            prompt_template TEXT,
            model_config TEXT,
            api_key TEXT,
            archived_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Seed Default Config
        db.get("SELECT count(*) as count FROM course_offerings", (err, row) => {
            if (!err && row.count === 0) {
                console.log("[Repo] Seeding default course config...");
                db.run(`INSERT INTO course_offerings (course_code, course_name, academic_year, semester, is_active, icon_url) 
                        VALUES ('MH1810', 'Mathematics 2', 'AY2025', 'Semester 2', 1, '/assets/uploads/mh1810_math.png')`);
            }
        });

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
                    // SET 1: Fundamentals (7 Questions covering Bloom's Taxonomy)
                    // Level 1: Remember (2 Questions)
                    { id: 'q1', text: 'Find the derivative of f(x) = x^2.', type: 'text', diff: 1, set: 1, context: 'Basic differentiation rules.' },
                    { id: 'q2', text: 'State the Power Rule for differentiation.', type: 'mcq', diff: 1, set: 1, options: ['nx^(n-1)', 'x^n/n', 'nx^n', 'n^x'], answer: ['nx^(n-1)'] },

                    // Level 2: Understand (1 Question + Image)
                    { id: 'q3', text: 'Explain why the function shown in the graph is discontinuous at x=0.', type: 'text', diff: 2, set: 1, media: { type: 'image', url: '/assets/uploads/discontinuity_jump.png', alt: 'Graph showing jump discontinuity' } },

                    // Level 3: Apply (1 Question + Image)
                    { id: 'q4', text: 'Calculate the average velocity between t=0 and t=5s based on the displacement graph.', type: 'text', diff: 3, set: 1, media: { type: 'image', url: '/assets/uploads/velocity_graph.png', alt: 'Displacement vs Time Graph' } },

                    // Level 4: Analyze (1 Question - MCQ)
                    { id: 'q5', text: 'Which step in the following integration by parts is incorrect?', type: 'mcq', diff: 4, set: 1, options: ['Step 1: Choose u=x', 'Step 2: dv=sin(x)dx', 'Step 3: v=cos(x)', 'Step 4: Answer is -xcos(x) + sin(x)'], answer: ['Step 3: v=cos(x)'] },

                    // Level 5: Evaluate (1 Question)
                    { id: 'q6', text: 'Critique the following statement: "Every continuous function is differentiable."', type: 'text', diff: 5, set: 1 },

                    // Level 6: Create (1 Question)
                    { id: 'q7', text: 'Construct a function f(x) that is continuous everywhere but not differentiable at x=2 and x=5.', type: 'text', diff: 6, set: 1 },

                    // SET 2: Vectors
                    { id: 'q11', text: 'Compute the dot product of (1, 2) and (3, 4).', type: 'text', diff: 2, set: 2 },
                    { id: 'q12', text: 'Find the cross product of i and j.', type: 'mcq', diff: 2, set: 2, options: ['k', '-k', '0', '1'], answer: ['k'] }
                ];

                questions.forEach(q => {
                    const stmt = `INSERT INTO questions (id, question_id, course_code, academic_year, semester, set_id, question_text, type, options, answer_key, difficulty, context, media) 
                                  VALUES (?, ?, 'MH1810', 'AY2025', 'Semester 2', ?, ?, ?, ?, ?, ?, ?, ?)`;
                    db.run(stmt, [
                        q.id, q.id.toUpperCase(), q.set, q.text, q.type,
                        q.options ? JSON.stringify(q.options) : null,
                        q.answer ? JSON.stringify(q.answer) : null,
                        q.diff,
                        q.context || null,
                        q.media ? JSON.stringify(q.media) : null
                    ]);
                });
            }
        });
    });
};

const runTransaction = (callback) => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            callback(db)
                .then(() => {
                    db.run("COMMIT", (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                })
                .catch((err) => {
                    db.run("ROLLBACK");
                    reject(err);
                });
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
                difficulty: Number(q.difficulty_level) || 1, // Legacy fallback
                difficultyLevel: Number(q.difficulty_level) || 1,
                difficultyName: q.difficulty_name,           // e.g. "Bloom's Taxonomy"
                difficultyLevelName: q.difficulty_level_name, // e.g. "Remember"
                set_id: Number(q.set_id) || 1
            }));

            // Modular Sorting Logic: Sequence ASC -> Difficulty ASC -> ID Natural Sort
            questions.sort((a, b) => {
                // 1. Sequence Order (Primary)
                const seqA = a.sequence_order || 0;
                const seqB = b.sequence_order || 0;
                if (seqA !== seqB) return seqA - seqB;

                // 2. Difficulty Level (Secondary)
                if (a.difficultyLevel !== b.difficultyLevel) return a.difficultyLevel - b.difficultyLevel;

                return 0;
            });

            resolve(questions);
        });
    });
};



// --- REORDER ---
const reorderQuestions = (items) => {
    return runTransaction((db) => {
        return Promise.all(items.map(item => {
            return new Promise((resolve, reject) => {
                db.run("UPDATE questions SET sequence_order = ? WHERE id = ?", [item.sequence_order, item.id], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }));
    });
};

// --- FACULTY METHODS ---

const getUserRole = (userId, courseCode, academicYear, semester) => {
    // Validating if the userId is an email
    if (userId.includes('@')) {
        const encryptedEmail = encryptDeterministic(userId);
        return getResult(
            "SELECT role FROM user_access_roles WHERE email = ? AND course_code = ? AND academic_year = ? AND semester = ?",
            [encryptedEmail, courseCode, academicYear, semester]
        ).then(row => {
            // Fallback: If no email match, try matching user_id as well (hybrid)
            if (row) return row;
            return getResult(
                "SELECT role FROM user_access_roles WHERE user_id = ? AND course_code = ? AND academic_year = ? AND semester = ?",
                [userId, courseCode, academicYear, semester]
            );
        });
    }

    return getResult(
        "SELECT role FROM user_access_roles WHERE user_id = ? AND course_code = ? AND academic_year = ? AND semester = ?",
        [userId, courseCode, academicYear, semester]
    );
};

const updateCourseConfig = (courseCode, academicYear, semester, config) => {
    const { iconUrl, promptTemplate, modelConfig, apiKey } = config;

    // 1. Fetch current config to archive
    return getResult(
        "SELECT prompt_template, model_config, api_key FROM course_offerings WHERE course_code = ? AND academic_year = ? AND semester = ?",
        [courseCode, academicYear, semester]
    ).then(current => {
        if (current) {
            // 2. Archive current version
            runQuery(
                `INSERT INTO course_config_history (course_code, academic_year, semester, prompt_template, model_config, api_key)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [courseCode, academicYear, semester, current.prompt_template, current.model_config, current.api_key]
            ).catch(e => console.warn("Failed to archive config history:", e));
        }

        // 3. Update to new version (Live)
        return runQuery(
            `UPDATE course_offerings SET 
                icon_url = COALESCE(?, icon_url),
                prompt_template = COALESCE(?, prompt_template),
                model_config = COALESCE(?, model_config),
                api_key = COALESCE(?, api_key)
            WHERE course_code = ? AND academic_year = ? AND semester = ?`,
            [iconUrl, promptTemplate, JSON.stringify(modelConfig), apiKey, courseCode, academicYear, semester]
        );
    });
};

const getSets = (courseCode, academicYear, semester) => {
    return new Promise((resolve, reject) => {
        db.all(
            "SELECT * FROM question_sets WHERE course_code = ? AND academic_year = ? AND semester = ? AND deleted_at IS NULL ORDER BY sequence_order ASC",
            [courseCode, academicYear, semester],
            (err, rows) => {
                if (err) reject(err);
                else {
                    // Decrypt Audit Fields
                    const decryptedRows = rows.map(r => ({
                        ...r,
                        created_by: decrypt(r.created_by),
                        updated_by: decrypt(r.updated_by)
                    }));
                    resolve(decryptedRows);
                }
            }
        );
    });
};

const getQuestionStats = (courseCode, academicYear, semester) => {
    return new Promise((resolve, reject) => {
        // User Request: Pull from Sets -> Questions -> Attempts (Left Join to ensure all questions appear)
        const sql = `
            SELECT 
                   qs.name as set_name,
                   q.id as question_id, 
                   q.question_text,
                   q.context,
                   COUNT(DISTINCT sqa.user_id) as students_attempted,
                   COALESCE(SUM(sqa.attempt_count), 0) as total_interactions,
                   COALESCE(AVG(sqa.is_correct), 0) as success_rate,
                   COALESCE(AVG(sqa.attempt_count), 0) as avg_tries
            FROM questions q
            JOIN question_sets qs ON q.set_id = qs.set_id 
                 AND q.course_code = qs.course_code 
                 AND q.academic_year = qs.academic_year 
                 AND q.semester = qs.semester
            LEFT JOIN student_question_attempts sqa ON q.id = sqa.question_id
            WHERE q.course_code = ? AND q.academic_year = ? AND q.semester = ?
            GROUP BY q.id
            ORDER BY qs.sequence_order, q.id
        `;
        db.all(sql, [courseCode, academicYear, semester], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// --- SETS MANAGEMENT ---
const upsertSet = (courseCode, academicYear, semester, set, userEmail) => {
    // Destructure with support for both camelCase (internal) and snake_case (DB/Frontend)
    const setId = set.setId || set.set_id;
    const name = set.name;
    // Check for undefined explicitly because isVisible can be false (0)
    const isVisible = (set.isVisible !== undefined) ? set.isVisible : set.is_visible;
    const sequenceOrder = set.sequenceOrder || set.sequence_order;
    const difficultyId = set.difficultyId || set.difficulty_id;
    const difficultyName = set.difficultyName || set.difficulty_name;

    // ENCRYPT PII
    const encryptedEmail = encrypt(userEmail);

    return runQuery(
        `INSERT INTO question_sets (course_code, academic_year, semester, set_id, name, is_visible, sequence_order, difficulty_id, difficulty_name, created_by, updated_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT(course_code, academic_year, semester, set_id) 
         DO UPDATE SET 
            name=excluded.name, 
            is_visible=excluded.is_visible, 
            sequence_order=excluded.sequence_order,
            difficulty_id=excluded.difficulty_id,
            difficulty_name=excluded.difficulty_name,
            updated_by=excluded.updated_by,
            updated_at=CURRENT_TIMESTAMP`,
        [courseCode, academicYear, semester, setId, name, isVisible ? 1 : 0, sequenceOrder, difficultyId, difficultyName, encryptedEmail, encryptedEmail]
    );
};

const getTaxonomies = () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT uuid, taxonomy_name, taxonomy_max_level, taxonomy_description FROM taxonomies", (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
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
    reorderQuestions, // Exported
    getQuestionStats,
    getTaxonomies, // Exported
    saveProgress,
    getProgress
};
