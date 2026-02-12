
import pg from 'pg';
const { Client } = pg;

const client = new Client({
    connectionString: 'postgresql://localhost:5432/ai_grader'
});

async function run() {
    try {
        await client.connect();

        // Check Questions
        const resQ = await client.query("SELECT count(*) FROM questions WHERE course_code = 'EE2101'");
        console.log(`EE2101 Questions Found: ${resQ.rows[0].count}`);

        // Check Questions for MH1810 (for comparison)
        const resM = await client.query("SELECT count(*) FROM questions WHERE course_code = 'MH1810'");
        console.log(`MH1810 Questions Found: ${resM.rows[0].count}`);

        // Check Users
        const resU = await client.query("SELECT * FROM users WHERE email LIKE '%del%' OR user_id = 'del_spooner'");
        console.log("Users Found:", resU.rows);

        await client.end();
    } catch (err) {
        console.error("DB Error:", err);
        process.exit(1);
    }
}

run();
