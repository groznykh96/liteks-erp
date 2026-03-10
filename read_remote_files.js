const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.exec('cat /var/www/liteks/src/components/Layout/Sidebar.tsx', (err, stream) => {
        if (err) throw err;
        stream.on('buffer', true).on('data', (data) => process.stdout.write(data)).on('close', () => {
            console.log('\n--- END SIDEBAR ---\n');
            conn.exec('cat /var/www/liteks/server/src/routes/training.ts', (err2, stream2) => {
                if (err2) throw err2;
                stream2.on('data', (d) => process.stdout.write(d)).on('close', () => conn.end());
            });
        });
    });
}).connect({ host: '185.177.219.94', port: 22, username: 'root', password: 'b4+U*hq8^cUVAZ' });
