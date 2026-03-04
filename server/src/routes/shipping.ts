import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import prisma from '../db';

const router = Router();
router.use(authenticateToken);

const isTMC = (role: string) => ['TMC', 'ADMIN', 'DIRECTOR'].includes(role);
const isStorekeeper = (role: string) => ['STOREKEEPER', 'ADMIN', 'DIRECTOR'].includes(role);
const isShippingStaff = (role: string) => isTMC(role) || isStorekeeper(role);

// 1. Get shipping orders
router.get('/', async (req: Request, res: Response) => {
    try {
        const userRole = (req as any).user?.role;
        if (!isShippingStaff(userRole)) return res.status(403).json({ error: 'Доступ запрещен' });

        const orders = await prisma.shippingOrder.findMany({
            include: {
                order: true,
                createdBy: { select: { fullName: true } },
                shippedBy: { select: { fullName: true } },
                items: {
                    include: {
                        nomenclature: true,
                        batch: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(orders);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка получения заданий на отгрузку' });
    }
});

// 2. Create shipping order
router.post('/', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!isTMC(user.role)) return res.status(403).json({ error: 'Только специалист ТМЦ может создавать задания на отгрузку' });

        const { orderId, orderNumber, notes, items } = req.body;
        // items should be array of { nomId, batchId?, requiredQty }

        if (!items || !items.length) {
            return res.status(400).json({ error: 'Задание должно содержать хотя бы одну позицию' });
        }

        const shippingOrder = await prisma.shippingOrder.create({
            data: {
                orderNumber: orderNumber || `SHP-${new Date().getTime()}`,
                orderId: orderId ? parseInt(orderId) : null,
                notes,
                createdById: user.id,
                items: {
                    create: items.map((i: any) => ({
                        nomId: parseInt(i.nomId),
                        batchId: i.batchId ? parseInt(i.batchId) : null,
                        requiredQty: parseInt(i.requiredQty),
                        pickedQty: 0
                    }))
                }
            },
            include: { items: true }
        });

        res.status(201).json(shippingOrder);
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка создания задания на отгрузку: ' + (e.message || '') });
    }
});

// 3. Storekeeper picks items
router.post('/:id/pick', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!isStorekeeper(user.role)) return res.status(403).json({ error: 'Только кладовщик может собирать задания' });

        const shippingOrderId = parseInt(req.params.id as string);
        const { itemId, pickedQty } = req.body; // itemId is ShippingOrderItem.id

        await prisma.$transaction(async (tx) => {
            const shipItem = await tx.shippingOrderItem.findUnique({ where: { id: parseInt(itemId) } });
            if (!shipItem || shipItem.shippingOrderId !== shippingOrderId) throw new Error('Позиция не найдена');

            const newQty = shipItem.pickedQty + parseInt(pickedQty);
            if (newQty > shipItem.requiredQty) throw new Error('Собрано больше, чем требуется. Проверьте количество.');

            await tx.shippingOrderItem.update({
                where: { id: shipItem.id },
                data: { pickedQty: newQty }
            });

            // check if entire order is fully picked -> update order status
            const allItems = await tx.shippingOrderItem.findMany({ where: { shippingOrderId } });
            const isGathering = allItems.some(i => i.pickedQty > 0 && i.pickedQty < i.requiredQty);
            const isReady = allItems.every(i => i.pickedQty >= i.requiredQty);

            await tx.shippingOrder.update({
                where: { id: shippingOrderId },
                data: { status: isReady ? 'READY' : (isGathering ? 'GATHERING' : 'NEW') }
            });
        });

        res.json({ success: true });
    } catch (e: any) {
        console.error(e);
        res.status(400).json({ error: e.message || 'Ошибка сборки' });
    }
});

// 4. Finalize shipment (deduct from warehouse)
router.post('/:id/ship', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!isTMC(user.role)) return res.status(403).json({ error: 'Только ТМЦ может финализировать отгрузку' });

        const shippingOrderId = parseInt(req.params.id as string);

        await prisma.$transaction(async (tx) => {
            const order = await tx.shippingOrder.findUnique({
                where: { id: shippingOrderId },
                include: { items: true }
            });
            if (!order) throw new Error('Задание не найдено');
            if (order.status === 'SHIPPED') throw new Error('Уже отгружено');

            // For each item, try to deduct from warehouse items
            for (const item of order.items) {
                let qtyToDeduct = item.pickedQty;
                if (qtyToDeduct <= 0) continue;

                // Find available warehouse items for this nomId/batchId
                const wItems = await tx.warehouseItem.findMany({
                    where: {
                        nomId: item.nomId,
                        batchId: item.batchId, // strictly match null or number
                        status: 'AVAILABLE',
                        quantity: { gt: 0 }
                    },
                    orderBy: { createdAt: 'asc' } // oldest first FIFO
                });

                let deducted = 0;
                for (const wi of wItems) {
                    if (deducted >= qtyToDeduct) break;
                    const take = Math.min(wi.quantity, qtyToDeduct - deducted);

                    // Deduct
                    const remaining = wi.quantity - take;
                    if (remaining === 0) {
                        await tx.warehouseItem.delete({ where: { id: wi.id } });
                    } else {
                        await tx.warehouseItem.update({
                            where: { id: wi.id },
                            data: { quantity: remaining }
                        });
                    }

                    // Log OUTCOME
                    await tx.warehouseTransaction.create({
                        data: {
                            type: 'OUTCOME',
                            nomId: item.nomId,
                            batchId: wi.batchId,
                            quantity: take,
                            fromLoc: wi.location,
                            userId: user.id
                        }
                    });

                    deducted += take;
                }

                if (deducted < qtyToDeduct) {
                    throw new Error(`Недостаточно запасов на складе для позиции ID ${item.id}. Собрано ${item.pickedQty}, списано ${deducted}`);
                }
            }

            // Mark shipped
            await tx.shippingOrder.update({
                where: { id: shippingOrderId },
                data: { status: 'SHIPPED', shippedById: user.id }
            });
        });

        res.json({ success: true });
    } catch (e: any) {
        console.error(e);
        res.status(400).json({ error: e.message || 'Ошибка отгрузки' });
    }
});

export default router;
