const { Client } = require('ssh2');

const conn = new Client();

const script = `
cd /var/www/liteks
echo "=== Pulling latest changes from GitHub ==="
git fetch
git reset --hard origin/main
echo "=== Building and restarting containers ==="
docker-compose up -d --build
echo "=== Checking container status ==="
docker-compose ps
echo "=== Deployment successful! ==="
`;

conn.on('ready', () => {
    conn.exec(script, { timeout: 300000 }, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log('Finished with exit code:', code);
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
