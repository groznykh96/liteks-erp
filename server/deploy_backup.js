const { Client } = require('ssh2');

const conn = new Client();

const script = `
cd /var/www/liteks
echo "=== Restarting containers with new config ==="
docker-compose up -d --build frontend
echo "=== Waiting for startup ==="
sleep 5
docker-compose ps
echo "=== Done! Site should be at https://litexal-it.ru ==="
`;

conn.on('ready', () => {
  conn.exec(script, { timeout: 120000 }, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('Finished, code:', code);
      conn.end();
    }).on('data', d => process.stdout.write(d.toString()))
      .stderr.on('data', d => process.stderr.write(d.toString()));
  });
}).connect({
  host: '185.177.219.94',
  port: 22,
  username: 'root',
  password: 'b4+U*hq8^cUVAZ'
});
