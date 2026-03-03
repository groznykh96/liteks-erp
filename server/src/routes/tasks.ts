import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { authenticateToken } from '../middlewares/authMiddleware';

const pool = new Pool({ connectionString: String(process.env.DATABASE_URL) });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const router = Router();

router.use(authenticateToken);

// Get Tasks
router.get('/', async (req: Request, res: Response) => {
    try {
        const { assignedToUserId, status } = req.query;
        const where: any = {};
        if (assignedToUserId) where.assignedToUserId = parseInt(assignedToUserId as string);
        if (status) where.status = status as string;

        const tasks = await prisma.task.findMany({
            where,
            include: {
                nomenclature: true,
                method: true,
                assignedUser: {
                    select: { id: true, fullName: true, department: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(tasks);
    } catch (e) {
        res.status(500).json({ error: 'DB Error finding tasks' });
    }
});

// Create Task
router.post('/', async (req: Request, res: Response) => {
    try {
        const { partCodeId, methodId, quantity, assignedToUserId, priority } = req.body;

        if (!partCodeId || isNaN(parseInt(partCodeId))) {
            return res.status(400).json({ error: 'Неверный код детали (partCodeId)' });
        }
        if (!methodId || isNaN(parseInt(methodId))) {
            return res.status(400).json({ error: 'Неверный метод литья (methodId)' });
        }
        if (!quantity || isNaN(parseInt(quantity))) {
            return res.status(400).json({ error: 'Неверное количество (quantity)' });
        }
        if (!assignedToUserId || isNaN(parseInt(assignedToUserId))) {
            return res.status(400).json({ error: 'Неверный исполнитель (assignedToUserId)' });
        }

        const taskNotes = priority ? `Приоритет: ${priority}` : null;

        const task = await prisma.task.create({
            data: {
                taskNumber: `T-${Date.now()}`,
                partCodeId: parseInt(partCodeId),
                methodId: parseInt(methodId),
                quantity: parseInt(quantity),
                assignedToUserId: assignedToUserId ? parseInt(assignedToUserId as string) : null,
                assignedByUserId: (req as any).user?.id,
                status: 'ASSIGNED',
                notes: taskNotes
            },
            include: { nomenclature: true, method: true, assignedUser: true }
        });
        res.status(201).json(task);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB Error creating task' });
    }
});

// Update Task
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const taskId = parseInt(req.params.id as string);
        const { status, assignedToUserId, quantity } = req.body;

        const data: any = {};
        if (status !== undefined) data.status = status;
        if (assignedToUserId !== undefined) data.assignedToUserId = assignedToUserId ? parseInt(assignedToUserId as string) : null;
        if (quantity !== undefined) data.quantity = parseInt(quantity as string);

        const updated = await prisma.task.update({
            where: { id: taskId },
            data,
            include: { nomenclature: true, method: true, assignedUser: true }
        });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: 'DB Error updating task' });
    }
});

// Delete Task
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const taskId = parseInt(req.params.id as string);

        const batches = await prisma.batch.findMany({ where: { taskId } });
        const batchIds = batches.map(b => b.id);

        if (batchIds.length > 0) {
            await prisma.qCReport.deleteMany({ where: { batchId: { in: batchIds } } });
        }
        await prisma.batch.deleteMany({ where: { taskId } });

        await prisma.task.delete({ where: { id: taskId } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'DB Error deleting task' });
    }
});

export default router;
