
const { Client } = require('pg');
require('dotenv').config();

const LABEL_MAP = {
    'Рабочий': 'Рабочий (Общий)',
    'Мастер': 'Мастер участка',
    'ОТК': 'Контролёр ОТК',
    'Менеджер по продажам': 'Менеджер продаж',
    'Директор': 'Руководитель'
};

const connectionString = process.env.DATABASE_URL;

async function main() {
    const client = new Client({ connectionString });
    await client.connect();
    console.log('Connected to PostgreSQL');

    try {
        const res = await client.query('SELECT id, departments FROM "TrainingMaterial"');
        console.log(`Found ${res.rows.length} materials`);

        for (const m of res.rows) {
            if (!m.departments) continue;
            try {
                let deps = JSON.parse(m.departments);
                if (!Array.isArray(deps)) continue;

                let updated = false;
                const newDeps = deps.map(d => {
                    if (LABEL_MAP[d]) {
                        updated = true;
                        return LABEL_MAP[d];
                    }
                    return d;
                });

                if (updated) {
                    console.log(`Updating material ${m.id}: [${deps}] -> [${newDeps}]`);
                    await client.query('UPDATE "TrainingMaterial" SET departments = $1 WHERE id = $2', [JSON.stringify(newDeps), m.id]);
                }
            } catch (e) {
                console.error(`Error processing material ${m.id}`, e.message);
            }
        }
        console.log('Update complete');
    } finally {
        await client.end();
    }
}

main().catch(console.error);
