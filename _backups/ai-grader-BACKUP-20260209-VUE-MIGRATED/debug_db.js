import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'ee2101.db');
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
    console.log("--- DEBUGGING DB CONTENT ---");

    db.all("SELECT * FROM question_sets", (err, rows) => {
        console.log(`Sets Count: ${rows ? rows.length : 0}`);
        if (rows) console.log(JSON.stringify(rows, null, 2));
    });

    db.all("SELECT * FROM questions", (err, rows) => {
        console.log(`Questions Count: ${rows ? rows.length : 0}`);
        if (rows && rows.length > 0) console.log(`Sample Question:`, JSON.stringify(rows[0], null, 2));
    });

    db.all(`
        SELECT q.id, q.set_id, qs.set_id as set_match 
        FROM questions q
        LEFT JOIN question_sets qs ON q.set_id = qs.set_id 
             AND q.course_code = qs.course_code 
             AND q.academic_year = qs.academic_year 
             AND q.semester = qs.semester
    `, (err, rows) => {
        console.log("Join Check (Left Join):");
        if (rows) console.log(JSON.stringify(rows, null, 2));
    });
});
