const { Pool } = require('pg');
const fs = require('fs');

// Parse .env manually, stripping surrounding quotes from values
const envPath = require('path').join(__dirname, '.env');
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx < 0) return;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
    }
    process.env[key] = val;
});

console.log('Connecting to:', process.env.DATABASE_URL);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// bcrypt hash of "123" (cost=10)
const hash = '$2b$10$.ryUJTPpgKnPjACe3HFoJOP69XcXQP6UqpWZ8lwppas4Vr2t.6xQ.';

pool.query('UPDATE "User" SET "passwordHash" = $1 WHERE login = $2', [hash, 'admin'])
    .then(r => {
        console.log('Обновлено строк:', r.rowCount);
        pool.end();
    })
    .catch(e => {
        console.error('Ошибка:', e.message);
        pool.end();
    });
