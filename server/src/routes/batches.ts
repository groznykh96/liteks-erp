import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import prisma from '../db';

const router = Router();
router.use(authenticateToken);

// Get Batches
router.get('/', async (req: Request, res: Response) => {
    try {
        const { taskId, workerId } = req.query;
        const where: any = {};

        if (taskId) where.taskId = parseInt(taskId as string);
        if (workerId) where.workerId = parseInt(workerId as string);

        const batches = await prisma.batch.findMany({
            where,
            include: {
                task: {
                    include: {
                        nomenclature: true,
                        method: true
                    }
                },
                worker: {
                    select: { id: true, fullName: true, department: true }
                },
                qcReports: { include: { photos: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(batches);
    } catch (e) {
        console.error('Error fetching batches:', e);
        res.status(500).json({ error: 'DB Error finding batches' });
    }
});

// Create Batch
router.post('/', async (req: Request, res: Response) => {
    try {
        const { batchNumber, taskId, completedQuantity, meltsCount, pouringTemp, moldTemp } = req.body;
        const workerId = (req as any).user?.id;

        if (!batchNumber || !taskId || !completedQuantity) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check for unique batch number
        const existingBatch = await prisma.batch.findUnique({
            where: { batchNumber }
        });

        if (existingBatch) {
            return res.status(409).json({ error: 'Партия с таким номером уже существует.' });
        }

        const batch = await prisma.batch.create({
            data: {
                batchNumber,
                taskId: parseInt(taskId),
                completedQuantity: parseInt(completedQuantity),
                meltsCount: meltsCount ? parseInt(meltsCount) : 1,
                pouringTemp: pouringTemp ? parseFloat(pouringTemp) : null,
                moldTemp: moldTemp ? parseFloat(moldTemp) : null,
                workerId: workerId
            },
            include: {
                task: { include: { nomenclature: true } }
            }
        });

        // Optionally, update the task status here if quantity is met
        // Example: if task.quantity <= sum(all batch.completedQuantity), status = 'DONE'

        res.status(201).json(batch);
    } catch (e) {
        console.error('Error creating batch:', e);
        res.status(500).json({ error: 'DB Error creating batch' });
    }
});

// Delete Batch (Optional based on business logic)
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        await prisma.batch.delete({ where: { id: parseInt(req.params.id as string) } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'DB Error deleting batch' });
    }
});

export default router;
