const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
let output = '';

const script = `
echo "=== DOCKER CONTAINERS ==="
docker ps -a
echo "\\n=== ROOT DIRS ==="
ls -la /root /var/www
echo "\\n=== DOCKER COMPOSE FILE CHECK ==="
if [ -f /root/docker-compose.yml ]; then cat /root/docker-compose.yml; fi
if [ -f /var/www/docker-compose.yml ]; then cat /var/www/docker-compose.yml; fi
`;

conn.on('ready', () => {
    conn.exec(script, { timeout: 120000 }, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            fs.writeFileSync('remote_env.txt', output);
            console.log('Saved to remote_env.txt. Exit code:', code);
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
