const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    const cmd = 'docker exec liteks-frontend-1 ls -lh /usr/share/nginx/html/assets/';
    console.log(`Executing: ${cmd}`);
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end()).on('data', (data) => process.stdout.write(data));
    });
}).connect({ host: '185.177.219.94', port: 22, username: 'root', password: 'b4+U*hq8^cUVAZ' });
