
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/ai_grader'
});

async function run() {
    const client = await pool.connect();
    try {
        const res = await client.query("SELECT * FROM users");
        console.log("All Users:", res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
}
run();
