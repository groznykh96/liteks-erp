const { Client } = require('ssh2');

const conn = new Client();

const script = `
cd /var/www/liteks
echo "=== Fetching backend logs ==="
docker-compose logs --tail=50 backend
echo "=== Checking database container status ==="
docker-compose ps db
`;

conn.on('ready', () => {
    conn.exec(script, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            conn.end();
            process.exit(code);
        }).on('data', d => process.stdout.write(d.toString()))
            .stderr.on('data', d => process.stderr.write(d.toString()));
    });
}).connect({
    host: '185.177.219.94',
    port: 22,
    username: 'root',
    password: 'b4+U*hq8^cUVAZ'
});
