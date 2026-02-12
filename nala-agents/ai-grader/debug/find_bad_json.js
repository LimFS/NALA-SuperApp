
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
            SELECT q.id, qv.options, qv.answer_key
            FROM questions q
            JOIN question_versions qv ON q.id = qv.question_id
            WHERE q.course_code = 'EE2101'
        `);

        console.log(`Scanning ${res.rows.length} rows...`);

        for (const row of res.rows) {
            // Check Options
            if (row.options && typeof row.options === 'string') {
                const trimmed = row.options.trim();
                if (!trimmed.startsWith('[') && !trimmed.startsWith('{') && trimmed !== 'null') {
                    console.log(`[BAD options] ID: ${row.id}, Value: "${row.options}"`);
                }
            }

            // Check Answer Key
            if (row.answer_key && typeof row.answer_key === 'string') {
                const trimmed = row.answer_key.trim();
                if (!trimmed.startsWith('[') && !trimmed.startsWith('{') && trimmed !== 'null') {
                    console.log(`[BAD answer_key] ID: ${row.id}, Value: "${row.answer_key}"`);
                }
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
}
run();
