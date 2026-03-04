import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import prisma from '../db';

const router = Router();
router.use(authenticateToken);

// Get Inspections
router.get('/', async (req: Request, res: Response) => {
    try {
        const inspections = await prisma.inspection.findMany({
            include: {
                task: {
                    include: { nomenclature: true, method: true }
                },
                inspector: {
                    select: { id: true, fullName: true }
                },
                defects: true
            },
            orderBy: { inspectionDate: 'desc' }
        });
        res.json(inspections);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB Error getting inspections' });
    }
});

// Create Inspection
router.post('/', async (req: Request, res: Response) => {
    try {
        const { taskId, acceptedQuantity, rejectedQuantity, comments } = req.body;
        const inspectorId = (req as any).user?.id;

        const inspection = await prisma.inspection.create({
            data: {
                taskId: Number(taskId),
                inspectorId: Number(inspectorId),
                acceptedQuantity: Number(acceptedQuantity),
                rejectedQuantity: Number(rejectedQuantity),
                comments: comments || ''
            },
            include: { task: true, inspector: true }
        });

        // Also update task status if needed
        await prisma.task.update({
            where: { id: Number(taskId) },
            data: { status: 'INSPECTED' }
        });

        res.status(201).json(inspection);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB Error creating inspection' });
    }
});

export default router;
