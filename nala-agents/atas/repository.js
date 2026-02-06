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

        // Seed Default Config
        db.get("SELECT count(*) as count FROM course_offerings", (err, row) => {
            if (!err && row.count === 0) {
                console.log("[Repo] Seeding default course config...");
                db.run(`INSERT INTO course_offerings (course_code, course_name, academic_year, semester, is_active) 
                        VALUES ('MH1810', 'Mathematics 2', 'AY2025', 'Semester 2', 1)`);
            }
        });

        // Seed Initial Questions if empty (Optional, mostly handled by external migration script usually, but kept here for completeness if desired, or assume DB exists)
        // For now we assume DB is populated or populated via migration script.
    });
};

/**
 * Get Questions for a Course filtered by Academic Context and optional Set ID.
 * Returns questions sorted by Difficulty (ASC) -> ID (Natural Sort).
 */
const getQuestions = (courseCode, academicYear, semester, setId = null) => {
    return new Promise((resolve, reject) => {
        let sql = "SELECT * FROM questions WHERE course_code = ? AND academic_year = ? AND semester = ?";
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
    run: runQuery
};
