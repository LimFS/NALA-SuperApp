
import sqlite3 from 'sqlite3';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Setup Paths & Config
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const SQLITE_DB_PATH = join(__dirname, '../atas.db');

// Postgres Connection
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
});

// SQLite Connection
const sqlite = new sqlite3.Database(SQLITE_DB_PATH);

const querySqlite = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        sqlite.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const migrate = async () => {
    console.log("🚀 Starting Migration: SQLite -> Postgres");
    console.log(`📂 SQLite: ${SQLITE_DB_PATH}`);
    console.log(`🐘 Postgres: ${process.env.DATABASE_URL}`);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Taxonomies
        console.log("... Migrating Taxonomies");
        const taxonomies = await querySqlite("SELECT * FROM taxonomies");
        for (const tax of taxonomies) {
            await client.query(`
                INSERT INTO taxonomies (uuid, taxonomy_name, taxonomy_max_level, taxonomy_description, created_at)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (uuid) DO NOTHING
            `, [tax.uuid, tax.taxonomy_name, tax.taxonomy_max_level, tax.taxonomy_description, tax.created_at]);
        }

        // 2. Course Offerings
        console.log("... Migrating Course Offerings");
        const courses = await querySqlite("SELECT * FROM course_offerings");
        for (const c of courses) {
            // SQLite is_active is typically 0/1, PG expects Integer or Boolean
            await client.query(`
                INSERT INTO course_offerings (course_code, academic_year, semester, icon_url, prompt_template, model_config, api_key, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (course_code, academic_year, semester) DO UPDATE SET 
                icon_url=EXCLUDED.icon_url, prompt_template=EXCLUDED.prompt_template, is_active=EXCLUDED.is_active
            `, [c.course_code, c.academic_year, c.semester, c.icon_url, c.prompt_template, c.model_config, c.api_key, c.is_active]);
        }

        // 3. User Roles
        console.log("... Migrating User Roles");
        const roles = await querySqlite("SELECT * FROM user_access_roles");
        for (const r of roles) {
            await client.query(`
                INSERT INTO user_access_roles (user_id, email, course_code, academic_year, semester, role)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (user_id, course_code, academic_year, semester) DO NOTHING
            `, [r.user_id, r.email, r.course_code, r.academic_year, r.semester, r.role]);
        }

        // 4. Question Sets
        console.log("... Migrating Question Sets");
        const sets = await querySqlite("SELECT * FROM question_sets");
        for (const s of sets) {
            await client.query(`
                INSERT INTO question_sets (course_code, academic_year, semester, set_id, name, sequence_order, is_visible, difficulty_id, difficulty_name, created_by, updated_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (course_code, academic_year, semester, set_id) DO NOTHING
            `, [s.course_code, s.academic_year, s.semester, s.set_id, s.name, s.sequence_order, s.is_visible, s.difficulty_id, s.difficulty_name, s.created_by, s.updated_by]);
        }

        // 5. Questions -> Questions (Identity) + Question Versions (Content)
        console.log("... Migrating Questions & Versions");
        const questions = await querySqlite("SELECT * FROM questions");

        for (const q of questions) {
            // A. Identity
            await client.query(`
                INSERT INTO questions (id, question_id, course_code, academic_year, semester, set_id, question_set_name, deleted_at, is_visible)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (id) DO NOTHING
            `, [q.id, q.question_id, q.course_code, q.academic_year, q.semester, q.set_id, q.question_set_name, q.deleted_at, true]); // Default visibility true if missing

            // B. Version 1 (Content)
            // Check if version 1 exists
            const vRes = await client.query("SELECT 1 FROM question_versions WHERE question_id = $1 AND version_number = 1", [q.id]);
            if (vRes.rowCount === 0) {
                await client.query(`
                    INSERT INTO question_versions (
                        question_id, version_number, 
                        question_text, type, options, answer_key, hint, explanation, media, difficulty, context,
                        is_visible
                    ) VALUES (
                        $1, 1,
                        $2, $3, $4, $5, $6, $7, $8, $9, $10,
                        $11
                    )
                 `, [
                    q.id,
                    q.question_text, q.type, q.options, q.answer_key, q.hint, q.explanation, q.media, q.difficulty_level, q.context,
                    true
                ]);
            }
        }

        // 6. Student Progress
        console.log("... Migrating Student Progress");
        // Drop and Recreate to ensure schema compatibility (UUID -> TEXT)
        await client.query("DROP TABLE IF EXISTS student_progress");
        await client.query(`
            CREATE TABLE student_progress (
                id SERIAL PRIMARY KEY,
                user_id TEXT,
                course_code TEXT,
                academic_year TEXT,
                semester TEXT,
                current_set_id INTEGER,
                current_difficulty TEXT,
                last_active_question_id TEXT,
                data JSONB,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, course_code, academic_year, semester)
            )
        `);

        const progress = await querySqlite("SELECT * FROM student_progress");
        for (const p of progress) {
            await client.query(`
                INSERT INTO student_progress (user_id, course_code, academic_year, semester, current_set_id, current_difficulty, last_active_question_id, data, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (user_id, course_code, academic_year, semester) DO UPDATE SET
                data = EXCLUDED.data, current_set_id = EXCLUDED.current_set_id
            `, [p.user_id, p.course_code, p.academic_year, p.semester, p.current_set_id, String(p.current_difficulty), p.last_active_question_id, p.data, p.updated_at]);
        }

        await client.query('COMMIT');
        console.log("✅ Migration Complete!");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("❌ Migration Failed:", e);
    } finally {
        client.release();
        pool.end();
        sqlite.close();
    }
};

migrate();
