const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH connected');
    // Rebuild BOTH backend and frontend to pick up server-side code changes
    conn.exec('cd /var/www/liteks && git pull origin main && docker-compose build backend frontend && docker-compose up -d --force-recreate backend frontend', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            console.log('Done :: code: ' + code);
            conn.end();
        }).on('data', (data) => {
            process.stdout.write('OUT: ' + data);
        }).stderr.on('data', (data) => {
            process.stderr.write('ERR: ' + data);
        });
    });
}).connect({
    host: '185.177.219.94',
    port: 22,
    username: 'root',
    password: 'b4+U*hq8^cUVAZ'
});
