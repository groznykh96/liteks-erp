const { Client } = require('ssh2');

const conn = new Client();

const script = `
cd /var/www/liteks
echo "=== Backend Logs ==="
docker-compose logs --tail=50 backend
echo "=== Frontend Logs ==="
docker-compose logs --tail=50 frontend
echo "=== DB Logs ==="
docker-compose logs --tail=50 db
`;

conn.on('ready', () => {
    conn.exec(script, { timeout: 120000 }, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            conn.end();
        }).on('data', d => process.stdout.write(d.toString()))
            .stderr.on('data', d => process.stderr.write(d.toString()));
    });
}).connect({
    host: '185.177.219.94',
    port: 22,
    username: 'root',
    password: 'b4+U*hq8^cUVAZ'
});
