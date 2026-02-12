import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkCounts() {
    try {
        console.log("Checking MH1810 Question Counts...");

        // 1. Count Total
        const resTotal = await pool.query(`
            SELECT COUNT(*) FROM questions 
            WHERE course_code = 'MH1810' AND academic_year = 'AY2025' AND semester = 'Semester 2'
        `);
        console.log(`Total MH1810 Questions (AY2025/Sem2): ${resTotal.rows[0].count}`);

        // 2. Group by Set
        const resSets = await pool.query(`
            SELECT set_id, COUNT(*) 
            FROM questions 
            WHERE course_code = 'MH1810' AND academic_year = 'AY2025' AND semester = 'Semester 2'
            GROUP BY set_id
            ORDER BY set_id
        `);
        console.log("By Set:");
        console.table(resSets.rows);

        // 3. Check for Duplicates (based on text)
        const resDupes = await pool.query(`
            SELECT qv.question_text, COUNT(*) 
            FROM questions q
            JOIN question_versions qv ON q.id = qv.question_id
            WHERE q.course_code = 'MH1810' AND q.academic_year = 'AY2025' AND semester = 'Semester 2'
            GROUP BY qv.question_text
            HAVING COUNT(*) > 1
        `);

        if (resDupes.rows.length > 0) {
            console.log("DUPLICATES FOUND:");
            console.table(resDupes.rows);
        } else {
            console.log("No duplicate question texts found.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

checkCounts();
