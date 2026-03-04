const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
let output = '';

const script = `
echo "=== DOCKER PS ==="
docker ps
echo "\\n=== DOCKER COMPOSE PS IN WWW ==="
cd /var/www && docker-compose ps 2>/dev/null || true
echo "\\n=== NGINX PROXY MANAGER CONF OR LOGS ==="
# Check if nginx proxy manager or certbot is running
netstat -tulpn | grep -E ':(80|443)'
`;

conn.on('ready', () => {
    conn.exec(script, { timeout: 120000 }, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            fs.writeFileSync('remote_network.txt', output);
            console.log('Saved to remote_network.txt. Exit code:', code);
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
