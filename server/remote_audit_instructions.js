const { Client } = require('ssh2');

const conn = new Client();

const auditScript = `
const prisma = require('./dist/db').default;

async function checkInstructions() {
    const roles = ['ADMIN', 'DIRECTOR', 'MASTER', 'TECH', 'OTK', 'SALES', 'TRAINER', 'TMC', 'STOREKEEPER', 'WORKER'];
    const instructions = await prisma.instructionPage.findMany();
    
    console.log('--- Instruction Audit ---');
    roles.forEach(role => {
        const inst = instructions.find(i => i.roleKey === role);
        if (inst) {
            console.log(\`[OK] \${role}: \${inst.title} (\${inst.content.length} chars)\`);
        } else {
            console.log(\`[MISSING] \${role}: No instruction page found\`);
        }
    });

    const otherKeys = instructions.filter(i => !roles.includes(i.roleKey));
    if (otherKeys.length > 0) {
        console.log('\\n--- Other Instructions ---');
        otherKeys.forEach(k => console.log(\`- \${k.roleKey}: \${k.title}\`));
    }
}

checkInstructions()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
`;

const script = `
cd /var/www/liteks
echo "${auditScript.replace(/`/g, '\\`').replace(/\$/g, '\\$')}" > temp_audit.js
docker cp temp_audit.js liteks-backend-1:/app/temp_audit.js
docker exec liteks-backend-1 node temp_audit.js
rm temp_audit.js
`;

conn.on('ready', () => {
    conn.exec(script, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            conn.end();
            process.exit(code);
        }).on('data', d => process.stdout.write(d.toString()))
            .stderr.on('data', d => process.stderr.write(d.toString()));
    });
}).connect({
    host: '185.177.219.94',
    port: 22,
    username: 'root',
    password: 'b4+U*hq8^cUVAZ'
});
