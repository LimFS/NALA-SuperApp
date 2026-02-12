import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '../../.env' });

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/atas_db'
});

async function verify() {
    try {
        console.log("🔍 Checking latest questions...");
        const res = await pool.query(`
            SELECT 
                q.id, q.set_id, 
                v.question_text, v.type, v.options, v.answer_key, v.explanation, v.hint, v.context, v.difficulty, v.created_at
            FROM questions q
            JOIN question_versions v ON q.id = v.question_id
            ORDER BY v.created_at DESC 
            LIMIT 10
        `);

        if (res.rows.length === 0) {
            console.log("⚠️ No questions found.");
        } else {
            res.rows.forEach(q => {
                console.log(`\n------------------------------------------------`);
                console.log(`🆔 ID: ${q.id} | Set: ${q.set_id} | Type: ${q.type} | Level: ${q.difficulty}`);
                console.log(`📝 Text: ${q.question_text ? q.question_text.substring(0, 100) : 'N/A'}...`);
                console.log(`❓ Options:`, q.options);
                console.log(`🔑 Key:`, q.answer_key);
                console.log(`💡 Hint: ${q.hint}`);
                console.log(`📖 Context: ${q.context ? q.context.substring(0, 50) + '...' : 'None'}`);
                console.log(`📘 Explanation: ${q.explanation ? q.explanation.substring(0, 50) + '...' : 'None'}`);
                console.log(`🕒 Created At: ${q.created_at}`);
            });
        }
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await pool.end();
    }
}

verify();
