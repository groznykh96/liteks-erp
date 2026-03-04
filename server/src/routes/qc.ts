import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import prisma from '../db';
const router = Router();
router.use(authenticateToken);

// Get QC Reports for a Batch or generally
router.get('/', async (req: Request, res: Response) => {
    try {
        const { batchId } = req.query;
        const where: any = {};

        if (batchId) where.batchId = parseInt(batchId as string);

        const reports = await prisma.qCReport.findMany({
            where,
            include: {
                batch: { include: { task: { include: { nomenclature: true } } } },
                inspector: { select: { id: true, fullName: true, department: true } },
                photos: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reports);
    } catch (e) {
        console.error('Error fetching QC reports:', e);
        res.status(500).json({ error: 'DB Error finding QC reports' });
    }
});

// Create QC Report for a Batch
router.post('/', async (req: Request, res: Response) => {
    try {
        // Here we expect photoUrls as an array of strings if using a cloud/local storage elsewhere,
        // or handled by multer middleware beforehand.
        const { batchId, acceptedQty, rejectedQty, comment, photoUrls, guiltyWorkerId } = req.body;
        const inspectorId = (req as any).user?.id;

        if (!batchId || acceptedQty === undefined || rejectedQty === undefined) {
            return res.status(400).json({ error: 'Missing required fields for QC Report' });
        }

        // Validate batch exists
        const batch = await prisma.batch.findUnique({
            where: { id: parseInt(batchId) },
            include: { task: true }
        });
        if (!batch) return res.status(404).json({ error: 'Партия не найдена' });

        const report = await prisma.qCReport.create({
            data: {
                batchId: parseInt(batchId),
                inspectorId: inspectorId,
                acceptedQty: parseInt(acceptedQty),
                rejectedQty: parseInt(rejectedQty),
                comment: comment || null,
                guiltyWorkerId: guiltyWorkerId ? parseInt(guiltyWorkerId) : null,
                photos: photoUrls && Array.isArray(photoUrls) ? {
                    create: photoUrls.map((url: string) => ({ photoUrl: url }))
                } : undefined
            },
            include: {
                photos: true,
                batch: { include: { worker: true, task: { include: { nomenclature: true } } } }
            }
        });

        // Optional: Implement Notification Logic here to notify batch.worker.id 
        // that their batch has been inspected

        // WAREHOUSE INTEGRATION: If acceptedQty > 0, move it to "Буфер ОТК" warehouse
        const accepted = parseInt(acceptedQty);
        if (accepted > 0) {
            const existingItem = await prisma.warehouseItem.findFirst({
                where: {
                    nomId: batch.task.partCodeId,
                    batchId: batch.id,
                    location: 'Буфер ОТК'
                }
            });

            if (existingItem) {
                await prisma.warehouseItem.update({
                    where: { id: existingItem.id },
                    data: { quantity: existingItem.quantity + accepted }
                });
            } else {
                await prisma.warehouseItem.create({
                    data: {
                        nomId: batch.task.partCodeId,
                        batchId: batch.id,
                        quantity: accepted,
                        location: 'Буфер ОТК'
                    }
                });
            }

            // Log Warehouse Transaction
            await prisma.warehouseTransaction.create({
                data: {
                    type: 'INCOME',
                    nomId: batch.task.partCodeId,
                    batchId: batch.id,
                    quantity: accepted,
                    toLoc: 'Буфер ОТК',
                    userId: inspectorId
                }
            });
        }

        res.status(201).json(report);
    } catch (e) {
        console.error('Error creating QC report:', e);
        res.status(500).json({ error: 'DB Error creating QC report' });
    }
});

export default router;
