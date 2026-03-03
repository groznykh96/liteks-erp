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

const DEFAULT_STAGES = [
    { stageKey: 'PREP', label: 'Подготовка оснастки', sortOrder: 1 },
    { stageKey: 'MELT', label: 'Плавка и заливка', sortOrder: 2 },
    { stageKey: 'KNOCKOUT', label: 'Выбивка и обрубка', sortOrder: 3 },
    { stageKey: 'HEAT_TREAT', label: 'Термообработка', sortOrder: 4 },
    { stageKey: 'MACHINING', label: 'Механическая обработка', sortOrder: 5 },
    { stageKey: 'QC', label: 'Контроль качества (ОТК)', sortOrder: 6 },
    { stageKey: 'SHIP', label: 'Упаковка и отгрузка', sortOrder: 7 },
];

const INCLUDE_FULL = {
    createdBy: { select: { id: true, fullName: true, role: true } },
    master: { select: { id: true, fullName: true, role: true } },
    items: true,
    stages: { orderBy: { sortOrder: 'asc' as const } },
    comments: {
        include: { author: { select: { id: true, fullName: true, role: true } } },
        orderBy: { createdAt: 'asc' as const }
    }
};

// GET /api/orders — list orders based on role
router.get('/', async (req: Request, res: Response) => {
    const currentUser = (req as any).user;
    try {
        const where: any = {};
        if (currentUser.role === 'SALES') {
            where.createdById = currentUser.id;
        } else if (currentUser.role === 'MASTER') {
            // Master sees orders assigned to them OR unaccepted ones
            where.OR = [{ masterId: currentUser.id }, { status: 'NEW' }];
        }
        // DIRECTOR and ADMIN see all orders
        const orders = await prisma.order.findMany({
            where,
            include: INCLUDE_FULL,
            orderBy: { createdAt: 'desc' }
        });
        res.json(orders);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB Error getting orders' });
    }
});

// POST /api/orders — create a new order (SALES/DIRECTOR/ADMIN)
router.post('/', async (req: Request, res: Response) => {
    const currentUser = (req as any).user;
    if (!['SALES', 'DIRECTOR', 'ADMIN'].includes(currentUser.role)) {
        return res.status(403).json({ error: 'Нет прав для создания заказа' });
    }
    try {
        const { clientName, clientPhone, clientEmail, notes, deadline, items, totalAmount } = req.body;
        if (!clientName || !deadline) {
            return res.status(400).json({ error: 'Клиент и срок обязательны' });
        }
        const orderNumber = `ЗАК-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
        const order = await prisma.order.create({
            data: {
                orderNumber,
                clientName,
                clientPhone,
                clientEmail,
                notes,
                deadline: new Date(deadline),
                totalAmount: totalAmount ? Number(totalAmount) : null,
                createdById: currentUser.id,
                status: 'NEW',
                stages: {
                    create: DEFAULT_STAGES.map(s => ({ ...s, status: 'PENDING' }))
                },
                items: items && items.length > 0 ? {
                    create: items.map((it: any) => ({
                        itemName: it.itemName,
                        quantity: Number(it.quantity),
                        weight: it.weight ? Number(it.weight) : null,
                        alloyName: it.alloyName || null,
                        pricePerUnit: it.pricePerUnit ? Number(it.pricePerUnit) : null,
                        nomId: it.nomId ? Number(it.nomId) : null,
                    }))
                } : undefined
            },
            include: INCLUDE_FULL
        });
        res.status(201).json(order);
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: 'DB Error creating order', detail: e?.message });
    }
});

// GET /api/orders/:id — get specific order
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const order = await prisma.order.findUnique({
            where: { id: parseInt(req.params.id as string) },
            include: INCLUDE_FULL
        });
        if (!order) return res.status(404).json({ error: 'Заказ не найден' });
        res.json(order);
    } catch (e) {
        res.status(500).json({ error: 'DB Error' });
    }
});

// PUT /api/orders/:id — update order status or assign master
router.put('/:id', async (req: Request, res: Response) => {
    const currentUser = (req as any).user;
    try {
        const orderId = parseInt(req.params.id as string);
        const { status, masterId } = req.body;
        const data: any = {};
        if (status) data.status = status;
        if (masterId !== undefined) data.masterId = masterId ? Number(masterId) : null;

        // Auto-assign master when accepting
        if (status === 'ACCEPTED' && currentUser.role === 'MASTER') {
            data.masterId = currentUser.id;
        }

        const order = await prisma.order.update({
            where: { id: orderId },
            data,
            include: INCLUDE_FULL
        });
        res.json(order);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB Error updating order' });
    }
});

// PUT /api/orders/:id/stages/:stageId — update a production stage
router.put('/:id/stages/:stageId', async (req: Request, res: Response) => {
    const currentUser = (req as any).user;
    try {
        const stageId = parseInt(req.params.stageId as string);
        const { status, plannedDate, actualDate, note } = req.body;
        const data: any = { updatedById: currentUser.id };
        if (status !== undefined) data.status = status;
        if (plannedDate !== undefined) data.plannedDate = plannedDate ? new Date(plannedDate) : null;
        if (actualDate !== undefined) data.actualDate = actualDate ? new Date(actualDate) : null;
        if (note !== undefined) data.note = note;

        const stage = await prisma.orderStage.update({
            where: { id: stageId },
            data
        });
        res.json(stage);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB Error updating stage' });
    }
});

// POST /api/orders/:id/comments — add comment
router.post('/:id/comments', async (req: Request, res: Response) => {
    const currentUser = (req as any).user;
    try {
        const orderId = parseInt(req.params.id as string);
        const { text } = req.body;
        if (!text?.trim()) return res.status(400).json({ error: 'Текст не может быть пустым' });
        const comment = await prisma.orderComment.create({
            data: { orderId, authorId: currentUser.id, text: text.trim() },
            include: { author: { select: { id: true, fullName: true, role: true } } }
        });
        res.status(201).json(comment);
    } catch (e) {
        res.status(500).json({ error: 'DB Error adding comment' });
    }
});

// DELETE /api/orders/:id — delete order (SALES owner or ADMIN)
router.delete('/:id', async (req: Request, res: Response) => {
    const currentUser = (req as any).user;
    try {
        const orderId = parseInt(req.params.id as string);
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) return res.status(404).json({ error: 'Не найден' });
        if (order.createdById !== currentUser.id && currentUser.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Нет прав для удаления' });
        }
        await prisma.orderComment.deleteMany({ where: { orderId } });
        await prisma.orderItem.deleteMany({ where: { orderId } });
        await prisma.orderStage.deleteMany({ where: { orderId } });
        await prisma.order.delete({ where: { id: orderId } });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB Error deleting order' });
    }
});

// GET /api/orders/stats/summary — for Director analytics
router.get('/stats/summary', async (req: Request, res: Response) => {
    const currentUser = (req as any).user;
    if (!['DIRECTOR', 'ADMIN'].includes(currentUser.role)) {
        return res.status(403).json({ error: 'Нет доступа' });
    }
    try {
        const [total, byStatus] = await Promise.all([
            prisma.order.count(),
            prisma.order.groupBy({
                by: ['status'],
                _count: { status: true }
            })
        ]);
        const overdue = await prisma.order.count({
            where: {
                deadline: { lt: new Date() },
                status: { notIn: ['SHIPPED', 'CLOSED'] }
            }
        });
        res.json({ total, byStatus, overdue });
    } catch (e) {
        res.status(500).json({ error: 'DB Error' });
    }
});

export default router;
