const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    // 1. Sync files
    // 2. npx prisma generate inside container
    // 3. npx prisma db push (since we are not using migrations properly in this setup, or we should use migrate deploy)
    // 4. node migrate_roles.js
    const cmd = 'docker exec liteks-backend-1 npx prisma db push && docker exec liteks-backend-1 node migrate_roles.js';
    console.log(`Executing: ${cmd}`);
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end()).on('data', (data) => process.stdout.write(data)).on('stderr', (data) => process.stderr.write(data));
    });
}).connect({ host: '185.177.219.94', port: 22, username: 'root', password: 'b4+U*hq8^cUVAZ' });
