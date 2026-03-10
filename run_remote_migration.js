const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    const cmd = 'docker cp /var/www/liteks/server/fix_labels.js liteks-backend-1:/app/fix_labels.js && docker exec liteks-backend-1 node fix_labels.js';
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
