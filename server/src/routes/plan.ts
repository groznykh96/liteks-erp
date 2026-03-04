import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import prisma from '../db';
const router = Router();
router.use(authenticateToken);

// Get Production Plans
router.get('/', async (req: Request, res: Response) => {
    try {
        const plans = await prisma.productionPlanItem.findMany({
            include: {
                nomenclature: true,
                method: true,
                tasks: true
            },
            orderBy: { planDate: 'desc' }
        });
        res.json(plans);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB Error getting plans' });
    }
});

// Create Production Plan
router.post('/', async (req: Request, res: Response) => {
    try {
        const { planDate, partCodeId, methodId, plannedQuantity, priority, notes } = req.body;
        const plan = await prisma.productionPlanItem.create({
            data: {
                planDate: planDate || new Date().toISOString().split('T')[0],
                partCodeId: Number(partCodeId),
                methodId: Number(methodId),
                plannedQuantity: Number(plannedQuantity),
                priority: priority ? Number(priority) : 1,
                status: 'NEW',
                notes: notes || ''
            },
            include: { nomenclature: true, method: true }
        });
        res.status(201).json(plan);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB Error creating plan' });
    }
});

// Delete Production Plan
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const planId = parseInt(req.params.id as string);

        const tasks = await prisma.task.findMany({ where: { planItemId: planId } });
        const taskIds = tasks.map(t => t.id);

        if (taskIds.length > 0) {
            const batches = await prisma.batch.findMany({ where: { taskId: { in: taskIds } } });
            const batchIds = batches.map(b => b.id);

            if (batchIds.length > 0) {
                await prisma.qCReport.deleteMany({ where: { batchId: { in: batchIds } } });
            }
            await prisma.batch.deleteMany({ where: { taskId: { in: taskIds } } });
            await prisma.task.deleteMany({ where: { planItemId: planId } });
        }

        await prisma.productionPlanItem.delete({
            where: { id: planId }
        });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB Error deleting plan' });
    }
});

export default router;
