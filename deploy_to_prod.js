const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();

const remoteRoot = '/var/www/liteks';
const localRoot = 'c:/Users/user/Desktop/ШИхта программа/v2';

const filesToSync = [
    { local: 'src/App.tsx', remote: 'src/App.tsx' },
    { local: 'src/index.css', remote: 'src/index.css' },
    { local: 'src/pages/Training/MyTraining.tsx', remote: 'src/pages/Training/MyTraining.tsx' },
    { local: 'src/components/Layout/Sidebar.tsx', remote: 'src/components/Layout/Sidebar.tsx' },
    { local: 'src/components/Admin/AdminPanel.tsx', remote: 'src/components/Admin/AdminPanel.tsx' },
    { local: 'src/pages/Instructions.tsx', remote: 'src/pages/Instructions.tsx' },
    { local: 'server/prisma/schema.prisma', remote: 'server/prisma/schema.prisma' },
    { local: 'server/src/routes/instructions.ts', remote: 'server/src/routes/instructions.ts' },
    { local: 'server/seed_instructions.js', remote: 'server/seed_instructions.js' },
    { local: 'server/migrate_roles.js', remote: 'server/migrate_roles.js' },
    { local: 'server/src/index.ts', remote: 'server/src/index.ts' },
    { local: 'server/src/middlewares/demoGuard.ts', remote: 'server/src/middlewares/demoGuard.ts' },
    { local: 'server/src/services/demoService.ts', remote: 'server/src/services/demoService.ts' },
    { local: 'server/src/routes/orders.ts', remote: 'server/src/routes/orders.ts' },
    { local: 'server/src/routes/api.ts', remote: 'server/src/routes/api.ts' },
    { local: 'server/src/routes/statistics.ts', remote: 'server/src/routes/statistics.ts' },
    { local: 'src/components/Demo/DemoOnboarding.tsx', remote: 'src/components/Demo/DemoOnboarding.tsx' },
    { local: 'server/create_demo_user.js', remote: 'server/create_demo_user.js' },
];

conn.on('ready', () => {
    console.log('SSH Ready');

    const dirs = [...new Set(filesToSync.map(f => path.dirname(f.remote).replace(/\\/g, '/')))];
    const mkdirCmd = `mkdir -p ${dirs.map(d => remoteRoot + '/' + d).join(' ')}`;
    
    console.log('Creating directories...');
    conn.exec(mkdirCmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            console.log('Directories created. Starting file sync...');
            conn.sftp(async (err, sftp) => {
                if (err) throw err;
                for (const file of filesToSync) {
                    const localPath = path.join(localRoot, file.local).replace(/\\/g, '/');
                    const remotePath = remoteRoot + '/' + file.remote;
                    console.log(`Uploading ${file.local}...`);
                    await new Promise((resolve, reject) => {
                        sftp.fastPut(localPath, remotePath, (err) => {
                            if (err) {
                                console.error(`Error uploading ${file.local}:`, err);
                                reject(err);
                            } else {
                                console.log(`Success: ${file.local}`);
                                resolve();
                            }
                        });
                    });
                }
                console.log('All files uploaded. Triggering rebuild...');
                triggerRebuild();
            });
        }).on('data', (d) => console.log('MKDIR OUT:', d.toString()))
          .stderr.on('data', (d) => console.error('MKDIR ERR:', d.toString()));
    });

    function triggerRebuild() {
        // Build frontend and backend. No-cache to be absolutely sure.
        const cmd = 'cd /var/www/liteks && docker-compose build --no-cache frontend backend && docker-compose up -d frontend backend';
        console.log(`Executing: ${cmd}`);
        conn.exec(cmd, (err, stream) => {
            if (err) throw err;
            stream.on('close', (code) => {
                console.log(`Rebuild finished with code ${code}`);
                // Since I already ran the migration script successfully, I don't need to run it again,
                // but if I did, it's safe. Site should be back up now.
                conn.end();
            }).on('data', (data) => process.stdout.write('OUT: ' + data))
                .stderr.on('data', (data) => process.stderr.write('ERR: ' + data));
        });
    }
}).connect({
    host: '185.177.219.94',
    port: 22,
    username: 'root',
    password: 'b4+U*hq8^cUVAZ'
});
