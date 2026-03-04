const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
let output = '';

const script = `
cd /var/www/liteks
docker-compose logs backend
`;

conn.on('ready', () => {
    conn.exec(script, { timeout: 120000 }, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            fs.writeFileSync('remote_logs.txt', output);
            console.log('Saved to remote_logs.txt. Exit code:', code);
            conn.end();
        }).on('data', d => {
            output += d.toString();
        }).stderr.on('data', d => {
            output += d.toString();
        });
    });
}).connect({
    host: '185.177.219.94',
    port: 22,
    username: 'root',
    password: 'b4+U*hq8^cUVAZ'
});
