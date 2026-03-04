import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import prisma from '../db';

const router = Router();
router.use(authenticateToken);

const STAGE_ROUTES: Record<string, string[]> = {
    KOKIL: ['CASTING', 'TRIMMING', 'QC', 'WAREHOUSE'],
    MLPD: ['CASTING', 'TRIMMING', 'QC', 'WAREHOUSE'],
    HTS: ['FORMING', 'POURING', 'KNOCKINGOUT', 'TRIMMING', 'FINISHING', 'HEAT_TREATMENT', 'QC', 'WAREHOUSE'],
};

// Get Batches
router.get('/', async (req: Request, res: Response) => {
    try {
        const { taskId, workerId } = req.query;
        const where: any = {};

        if (taskId) where.taskId = parseInt(taskId as string);
        if (workerId) where.workerId = parseInt(workerId as string);

        const batches = await (prisma as any).batch.findMany({
            where,
            include: {
                task: {
                    include: { nomenclature: true, method: true }
                },
                worker: { select: { id: true, fullName: true, department: true } },
                qcReports: { include: { photos: true } },
                stages: {
                    include: { worker: { select: { id: true, fullName: true } } },
                    orderBy: { id: 'asc' }
                }
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
        const { batchNumber, taskId, completedQuantity, meltsCount, pouringTemp, moldTemp, route } = req.body;
        const workerId = (req as any).user?.id;

        if (!taskId || !completedQuantity) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const batchRoute = route || 'KOKIL';
        const isHTS = batchRoute === 'HTS';
        const actualBatchNumber = batchNumber || (isHTS ? `FORM-${Date.now()}` : null);
        if (!actualBatchNumber) {
            return res.status(400).json({ error: 'Укажите номер партии' });
        }

        const existingBatch = await prisma.batch.findUnique({ where: { batchNumber: actualBatchNumber } });
        if (existingBatch) {
            return res.status(409).json({ error: 'Партия с таким номером уже существует.' });
        }

        const stageChain = STAGE_ROUTES[batchRoute] || STAGE_ROUTES['KOKIL'];
        const firstStage = stageChain[0];
        const qty = parseInt(completedQuantity);

        const batch = await (prisma as any).batch.create({
            data: {
                batchNumber: actualBatchNumber,
                taskId: parseInt(taskId),
                completedQuantity: qty,
                meltsCount: meltsCount ? parseInt(meltsCount) : 1,
                pouringTemp: pouringTemp ? parseFloat(pouringTemp) : null,
                moldTemp: moldTemp ? parseFloat(moldTemp) : null,
                workerId: workerId,
                route: batchRoute,
                currentStage: firstStage,
                stages: {
                    create: stageChain.map((stage: string, i: number) => ({
                        stage,
                        status: 'PENDING',
                        workerId: i === 0 ? workerId : null,
                        qtyIn: i === 0 ? qty : null,
                    })),
                },
            },
            include: {
                task: { include: { nomenclature: true } },
                stages: true,
            }
        });

        res.status(201).json(batch);
    } catch (e) {
        console.error('Error creating batch:', e);
        res.status(500).json({ error: 'DB Error creating batch' });
    }
});

// Delete Batch
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        await prisma.batch.delete({ where: { id: parseInt(req.params.id as string) } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'DB Error deleting batch' });
    }
});

export default router;
