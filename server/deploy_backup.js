const { Client } = require('ssh2');

const conn = new Client();

const script = `
mkdir -p /var/backups/postgres
cat << 'EOF' > /var/backups/postgres/backup.sh
#!/bin/bash
BACKUP_DIR="/var/backups/postgres"

# Delete backups older than 3 days
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +3 -delete

# Create new backup from Docker container
# The database is "liteks_db" and user is "liteks_user" based on the environment variables
BACKUP_FILE="$BACKUP_DIR/erp_backup_$(date +%Y-%m-%d).sql.gz"
docker exec -t liteks-db-1 pg_dump -U liteks_user -d liteks_db | gzip > "$BACKUP_FILE"
EOF
chmod +x /var/backups/postgres/backup.sh

# Remove existing cron job if any, then add the new one
(crontab -l 2>/dev/null | grep -v "/var/backups/postgres/backup.sh" ; echo "0 3 * * * /var/backups/postgres/backup.sh") | crontab -

echo "Setup completed. Manually running the backup script for verification..."
/var/backups/postgres/backup.sh
echo "Backup execution finished. Listed directory contents:"
ls -lh /var/backups/postgres/
`;

conn.on('ready', () => {
    console.log('Client :: ready');
    conn.exec(script, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            console.log('Stream :: close :: code: ' + code);
            conn.end();
        }).on('data', (data) => {
            console.log('STDOUT: ' + data);
        }).stderr.on('data', (data) => {
            console.error('STDERR: ' + data);
        });
    });
}).connect({
    host: '185.177.219.94',
    port: 22,
    username: 'root',
    password: 'b4+U*hq8^cUVAZ'
});
