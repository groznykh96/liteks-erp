const { Client } = require('ssh2');

const remoteRoot = '/var/www/liteks';
const conn = new Client();

conn.on('ready', () => {
    console.log('SSH Ready');
    // First, copy the script from the remote host to the container
    const cpCmd = `docker cp ${remoteRoot}/server/create_demo_user.js liteks-backend-1:/app/create_demo_user.js`;
    const runCmd = 'docker exec liteks-backend-1 node create_demo_user.js';
    
    console.log(`Executing: ${cpCmd} && ${runCmd}`);
    conn.exec(`${cpCmd} && ${runCmd}`, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log(`Execution finished with code ${code}`);
            conn.end();
            process.exit(code);
        }).on('data', (data) => process.stdout.write('OUT: ' + data))
          .stderr.on('data', (data) => process.stderr.write('ERR: ' + data));
    });
}).connect({
    host: '185.177.219.94',
    port: 22,
    username: 'root',
    password: 'b4+U*hq8^cUVAZ'
});
