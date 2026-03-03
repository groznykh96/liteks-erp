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

const INCLUDE_FULL = {
    createdBy: { select: { id: true, fullName: true, role: true } },
    assignedTo: { select: { id: true, fullName: true, role: true, department: true } },
    comments: {
        include: {
            author: { select: { id: true, fullName: true, role: true } }
        },
        orderBy: { createdAt: 'asc' as const }
    }
};

// GET /api/director-tasks — get tasks relevant to the current user
router.get('/', async (req: Request, res: Response) => {
    const currentUser = (req as any).user;
    try {
        const where: any = {};

        // Director/Admin sees all tasks they created
        if (currentUser.role === 'DIRECTOR' || currentUser.role === 'ADMIN') {
            where.createdById = currentUser.id;
        } else {
            // Other roles see only tasks assigned to them
            where.assignedToId = currentUser.id;
        }

        const tasks = await prisma.directorTask.findMany({
            where,
            include: INCLUDE_FULL,
            orderBy: { createdAt: 'desc' }
        });
        res.json(tasks);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB Error getting director tasks' });
    }
});

// POST /api/director-tasks — create new task (Director / Admin only)
router.post('/', async (req: Request, res: Response) => {
    const currentUser = (req as any).user;
    if (currentUser.role !== 'DIRECTOR' && currentUser.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Нет прав для создания задачи' });
    }
    try {
        const { title, description, priority, assignedToId, deadline } = req.body;
        if (!title || !description || !assignedToId) {
            return res.status(400).json({ error: 'Заполните все обязательные поля' });
        }
        const task = await prisma.directorTask.create({
            data: {
                title,
                description,
                priority: Number(priority) || 1,
                assignedToId: Number(assignedToId),
                createdById: currentUser.id,
                deadline: deadline ? new Date(deadline) : null,
                status: 'NEW'
            },
            include: INCLUDE_FULL
        });
        res.status(201).json(task);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB Error creating director task' });
    }
});

// PUT /api/director-tasks/:id — update status (assignee can update status)
router.put('/:id', async (req: Request, res: Response) => {
    const currentUser = (req as any).user;
    const taskId = parseInt(req.params.id as string, 10);
    try {
        const existing = await prisma.directorTask.findUnique({ where: { id: taskId } });
        if (!existing) return res.status(404).json({ error: 'Задача не найдена' });

        // Only the assignee or director/admin can update
        if (existing.assignedToId !== currentUser.id &&
            currentUser.role !== 'DIRECTOR' && currentUser.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Нет прав для изменения задачи' });
        }

        const { status } = req.body;
        const updated = await prisma.directorTask.update({
            where: { id: taskId },
            data: { status },
            include: INCLUDE_FULL
        });
        res.json(updated);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB Error updating director task' });
    }
});

// POST /api/director-tasks/:id/comments — add a comment to a task
router.post('/:id/comments', async (req: Request, res: Response) => {
    const currentUser = (req as any).user;
    const taskId = parseInt(req.params.id as string, 10);
    try {
        const { text } = req.body;
        if (!text?.trim()) return res.status(400).json({ error: 'Текст комментария не может быть пустым' });

        const comment = await prisma.directorTaskComment.create({
            data: {
                taskId,
                authorId: currentUser.id,
                text: text.trim()
            },
            include: {
                author: { select: { id: true, fullName: true, role: true } }
            }
        });
        res.status(201).json(comment);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB Error adding comment' });
    }
});

// DELETE /api/director-tasks/:id — director can delete a task
router.delete('/:id', async (req: Request, res: Response) => {
    const currentUser = (req as any).user;
    if (currentUser.role !== 'DIRECTOR' && currentUser.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Нет прав для удаления задачи' });
    }
    try {
        const taskId = parseInt(req.params.id as string, 10);
        await prisma.directorTaskComment.deleteMany({ where: { taskId } });
        await prisma.directorTask.delete({ where: { id: taskId } });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB Error deleting task' });
    }
});

export default router;
