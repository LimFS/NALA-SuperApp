
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/ai_grader'
});

async function run() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT q.id, qv.options, qv.answer_key, qv.media 
            FROM questions q
            JOIN question_versions qv ON q.id = qv.question_id
            WHERE q.course_code = 'EE2101'
        `);
        console.log("Raw Data:", res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
}
run();
