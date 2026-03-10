const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.exec('head -n 200 /var/www/liteks/src/pages/Training/MyTraining.tsx && echo "---SEPARATOR---" && cat /var/www/liteks/src/components/Layout/Sidebar.tsx', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end()).on('data', (data) => process.stdout.write(data));
    });
}).connect({ host: '185.177.219.94', port: 22, username: 'root', password: 'b4+U*hq8^cUVAZ' });
