const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    const cmd = 'cat /var/www/liteks/nginx.conf && echo "---INDEX.HTML---" && cat /var/www/liteks/dist/index.html';
    console.log(`Executing: ${cmd}`);
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end()).on('data', (data) => process.stdout.write(data));
    });
}).connect({ host: '185.177.219.94', port: 22, username: 'root', password: 'b4+U*hq8^cUVAZ' });
