
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

        console.log(`Checking ${res.rows.length} rows...`);

        for (const row of res.rows) {
            try {
                if (row.options) JSON.parse(row.options);
            } catch (e) {
                console.error(`[ERROR] ID: ${row.id} - Invalid options: "${row.options}"`, e.message);
            }

            try {
                if (row.answer_key) JSON.parse(row.answer_key);
            } catch (e) {
                console.error(`[ERROR] ID: ${row.id} - Invalid answer_key: "${row.answer_key}"`, e.message);
            }

            try {
                if (row.media) JSON.parse(row.media);
            } catch (e) {
                console.error(`[ERROR] ID: ${row.id} - Invalid media: "${row.media}"`, e.message);
            }
        }
        console.log("Check complete.");
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
}
run();
