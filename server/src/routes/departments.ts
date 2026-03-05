import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Only certain roles can edit departments (Master, Tech, Director, Admin)
function checkDepartmentAdmin(req: Request, res: Response, next: any) {
    const userRole = (req as any).user?.role;
    if (['ADMIN', 'DIRECTOR', 'MASTER', 'TECHNOLOGIST', 'TECH'].includes(userRole)) {
        next();
    } else {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
}

// GET /api/departments (all authenticated users can read, so they show in dropdowns)
router.get('/', authenticateToken, async (req: Request, res: Response) => {
    try {
        const deps = await prisma.department.findMany({
            orderBy: { name: 'asc' }
        });

        // If empty, seed default departments
        if (deps.length === 0) {
            await prisma.department.createMany({
                data: [
                    { name: 'ХТС' },
                    { name: 'Кокиль' },
                    { name: 'МЛПД' },
                    { name: 'ОТК' }
                ],
                skipDuplicates: true
            });
            const newDeps = await prisma.department.findMany({ orderBy: { name: 'asc' } });
            return res.json(newDeps);
        }

        res.json(deps);
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/departments
router.post('/', authenticateToken, checkDepartmentAdmin, async (req: Request, res: Response) => {
    try {
        const { id, name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Название подразделения обязательно' });
        }

        if (id) {
            const up = await prisma.department.update({
                where: { id },
                data: { name: name.trim() }
            });
            return res.json(up);
        } else {
            const cr = await prisma.department.create({
                data: { name: name.trim() }
            });
            return res.json(cr);
        }
    } catch (e: any) {
        console.error(e);
        if (e.code === 'P2002') {
            return res.status(400).json({ error: 'Такое подразделение уже существует' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/departments/:id
router.delete('/:id', authenticateToken, checkDepartmentAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.department.delete({ where: { id: Number(id) } });
        res.json({ success: true });
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
