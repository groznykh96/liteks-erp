import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: String(process.env.DATABASE_URL) });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, login: true, fullName: true, role: true, department: true }
        });
        res.json(users);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка получения пользователей' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const authReq = req as any;
        if (authReq.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Нет прав доступа' });
        }

        const id = parseInt(req.params.id as string);
        if (id === authReq.user.id) {
            return res.status(400).json({ error: 'Нельзя удалить самого себя' });
        }

        await prisma.user.delete({ where: { id } });
        res.json({ message: 'Пользователь удален' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка удаления пользователя' });
    }
};
