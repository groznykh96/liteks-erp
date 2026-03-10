
const { Client } = require('pg');
require('dotenv').config();

async function main() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Tables:', tables.rows.map(r => r.table_name));

        for (const t of tables.rows) {
            const count = await client.query(`SELECT COUNT(*) FROM "${t.table_name}"`);
            console.log(`Count in ${t.table_name}: ${count.rows[0].count}`);
        }
    } finally {
        await client.end();
    }
}

main().catch(console.error);
