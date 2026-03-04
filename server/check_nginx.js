const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
let output = '';

const script = `
echo "=== NGINX HOST SERVICE ==="
systemctl status nginx --no-pager || echo "nginx not installed or running"
echo "\\n=== NGINX SITES ENABLED ==="
ls -la /etc/nginx/sites-enabled || echo "no sites-enabled"
cat /etc/nginx/sites-enabled/* 2>/dev/null || true
echo "\\n=== CERTBOT CERTS ==="
ls -la /etc/letsencrypt/live || echo "no letsencrypt"
`;

conn.on('ready', () => {
    conn.exec(script, { timeout: 120000 }, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            fs.writeFileSync('remote_nginx_check.txt', output);
            console.log('Saved to remote_nginx_check.txt. Exit code:', code);
            conn.end();
        }).on('data', d => {
            output += d.toString();
        }).stderr.on('data', d => {
            output += d.toString();
        });
    });
}).connect({
    host: '185.177.219.94',
    port: 22,
    username: 'root',
    password: 'b4+U*hq8^cUVAZ'
});
