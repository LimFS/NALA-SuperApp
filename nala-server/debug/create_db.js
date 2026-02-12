const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://localhost:5432/postgres'
});

async function createDb() {
    try {
        await client.connect();
        // Check if db exists
        const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'nala_db'");
        if (res.rows.length === 0) {
            await client.query('CREATE DATABASE nala_db');
            console.log("Database nala_db created successfully.");
        } else {
            console.log("Database nala_db already exists.");
        }
    } catch (err) {
        console.error("Error creating database:", err);
    } finally {
        await client.end();
    }
}

createDb();
