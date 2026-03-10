const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    const cmd = 'cd /var/www/liteks && docker ps && echo "---BACKEND LOGS---" && docker-compose logs --tail=100 backend && echo "---FRONTEND LOGS---" && docker-compose logs --tail=100 frontend';
    console.log(`Executing: ${cmd}`);
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log(`Command finished with code ${code}`);
            conn.end();
        }).on('data', (data) => process.stdout.write(data))
            .stderr.on('data', (data) => process.stderr.write(data));
    });
}).connect({ host: '185.177.219.94', port: 22, username: 'root', password: 'b4+U*hq8^cUVAZ' });
