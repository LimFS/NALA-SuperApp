const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const legacyDbPath = path.join(__dirname, '../../nala-server/nala.db'); // Relative to nala-agents/atas
const newDbPath = path.join(__dirname, 'atas.db'); // In same dir

const legacyDb = new sqlite3.Database(legacyDbPath);
const newDb = new sqlite3.Database(newDbPath);

legacyDb.all("SELECT * FROM student_progress", [], (err, rows) => {
    if (err) {
        console.error("Error reading legacy DB:", err);
        return;
    }
    if (rows.length === 0) {
        console.log("No legacy progress found.");
        return;
    }

    console.log(`Found ${rows.length} progress records. Migrating...`);

    newDb.serialize(() => {
        const stmt = newDb.prepare(`INSERT OR REPLACE INTO student_progress 
            (user_id, course_code, academic_year, semester, current_set_id, current_difficulty, last_active_question_id, data, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

        rows.forEach(row => {
            stmt.run(
                row.user_id,
                row.course_code,
                row.academic_year,
                row.semester,
                row.current_set_id,
                row.current_difficulty,
                row.last_active_question_id,
                row.data,
                row.updated_at
            );
        });

        stmt.finalize(() => {
            console.log("Migration complete.");
            legacyDb.close();
            newDb.close();
        });
    });
});
