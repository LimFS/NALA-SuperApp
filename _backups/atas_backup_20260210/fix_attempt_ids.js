
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'atas.db');
const db = new sqlite3.Database(dbPath);

console.log(`Openning DB at ${dbPath}`);

db.all("SELECT user_id, course_code, question_id, set_id FROM student_question_attempts", [], (err, rows) => {
    if (err) {
        console.error("Read error:", err);
        return;
    }

    console.log(`Scanning ${rows.length} records...`);

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        let updates = 0;
        rows.forEach(row => {
            // Regex to find legacy long IDs ending in _Q<number> or just Q<number>
            // Example: MH1810_AY2025_S2_S1_Q11 -> q11
            const match = row.question_id.match(/_Q(\d+)$/i);
            if (match) {
                const newId = `q${match[1]}`; // e.g. q11
                if (newId !== row.question_id) {
                    // console.log(`Fixing ${row.question_id} -> ${newId}`);
                    db.run(
                        "UPDATE student_question_attempts SET question_id = ? WHERE user_id = ? AND course_code = ? AND question_id = ?",
                        [newId, row.user_id, row.course_code, row.question_id]
                    );
                    updates++;
                }
            } else if (row.question_id.match(/^Q(\d+)$/)) {
                // Fix simple "Q1" to "q1" (case sensitivity in join?)
                const matchSimple = row.question_id.match(/^Q(\d+)$/);
                const newId = `q${matchSimple[1]}`;
                if (newId !== row.question_id) {
                    db.run(
                        "UPDATE student_question_attempts SET question_id = ? WHERE user_id = ? AND course_code = ? AND question_id = ?",
                        [newId, row.user_id, row.course_code, row.question_id]
                    );
                    updates++;
                }
            }
        });

        db.run("COMMIT", () => {
            console.log(`Commit complete. Updated ${updates} records.`);
        });
    });
});
