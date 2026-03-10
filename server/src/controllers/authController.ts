import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../db';

const SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const login = async (req: Request, res: Response) => {
    try {
        const { login, password } = req.body;
        if (!login || (!password && login !== 'demo')) return res.status(400).json({ error: 'Требуется логин и пароль' });

        if (login === 'demo') {
            let demoUser = await prisma.user.findUnique({ where: { login: 'demo' } });
            if (!demoUser) {
                const salt = await bcrypt.genSalt(10);
                const passwordHash = await bcrypt.hash('demo', salt);
                demoUser = await prisma.user.create({
                    data: {
                        login: 'demo',
                        passwordHash,
                        fullName: 'Демо Пользователь',
                        role: 'DEMO',
                        department: 'Демонстрация'
                    }
                });
            }
            const payload = {
                id: demoUser.id,
                login: demoUser.login,
                role: demoUser.role,
                fullName: demoUser.fullName
            };
            const token = jwt.sign(payload, SECRET);
            return res.json({ token, user: payload });
        }

        const user = await prisma.user.findUnique({ where: { login } });
        if (!user || !user.isActive) return res.status(401).json({ error: 'Неверный логин или аккаунт отключен' });

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) return res.status(401).json({ error: 'Неверный пароль' });

        const payload = {
            id: user.id,
            login: user.login,
            role: user.role,
            fullName: user.fullName
        };
        const token = jwt.sign(payload, SECRET);

        res.json({ token, user: payload });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

export const createUser = async (req: Request, res: Response) => {
    try {
        // ONLY admin can create users
        const authReq = req as any;
        if (authReq.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Нет прав доступа' });
        }

        const { fullName, login, password, role, department } = req.body;

        const existing = await prisma.user.findUnique({ where: { login } });
        if (existing) return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = await prisma.user.create({
            data: {
                fullName,
                login,
                passwordHash,
                role,
                department
            }
        });

        res.json({ id: newUser.id, login: newUser.login, fullName: newUser.fullName, role: newUser.role });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

export const getMe = async (req: Request, res: Response) => {
    const authReq = req as any;
    res.json(authReq.user);
};
