import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        console.log("--- QUESTION SETS (MH1810) ORDERED BY SEQUENCE ---");
        const sets = await pool.query(`
            SELECT *
            FROM question_sets 
            WHERE course_code = 'MH1810' 
            ORDER BY sequence_order ASC, id ASC
        `);
        console.table(sets.rows.map(s => ({
            id: s.id,
            setId: s.set_id, // Logical ID
            name: s.set_name || s.name,
            seq: s.sequence_order,
            visible: s.is_visible,
            ay: s.academic_year,
            sem: s.semester
        })));

        console.log("\n--- STUDENT PROGRESS ---");
        const progress = await pool.query('SELECT * FROM student_progress');

        if (progress.rows.length > 0) {
            console.log("Found", progress.rows.length, "progress records.");
            progress.rows.forEach(r => {
                console.log(`\nUser: ${r.user_id}`);
                console.log(JSON.stringify(r.data, null, 2));
            });
        } else {
            console.log("No student progress found.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

check();
