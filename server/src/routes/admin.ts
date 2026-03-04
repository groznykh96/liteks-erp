import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const router = Router();

// Define custom interface for user to satisfy TS
interface AuthenticatedRequest extends Request {
    user?: any;
}

router.use(authenticateToken);

router.get('/backup', async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }

        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            return res.status(500).json({ error: 'DATABASE_URL не настроен' });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `erp_backup_${timestamp}.sql`;
        const backupFilePath = path.join('/tmp', backupFileName);

        console.log(`[Backup] Starting database dump to ${backupFilePath}`);

        // Generate dump
        exec(`pg_dump "${dbUrl}" > "${backupFilePath}"`, { timeout: 60000 }, (error, stdout, stderr) => {
            if (error) {
                console.error('[Backup Error]', error);
                console.error('[Backup Stderr]', stderr);
                return res.status(500).json({
                    error: 'Ошибка при создании резервной копии. Проверьте установлен ли postgresql-client на сервере.',
                    details: error.message
                });
            }

            console.log(`[Backup] Dump successful, sending file to client...`);
            res.download(backupFilePath, backupFileName, (err) => {
                if (err) {
                    console.error('[Backup Download Error]', err);
                }
                // Cleanup temp file after download completes or fails
                try {
                    if (fs.existsSync(backupFilePath)) {
                        fs.unlinkSync(backupFilePath);
                        console.log(`[Backup] Cleaned up temporary file ${backupFilePath}`);
                    }
                } catch (cleanupErr) {
                    console.error('[Backup Cleanup Error]', cleanupErr);
                }
            });
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

export default router;
