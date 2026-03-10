import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import prisma from '../db';
import { DemoService } from '../services/demoService';

const router = Router();
router.use(authenticateToken);

// Role guard for TMC / STOREKEEPER / ADMIN / DIRECTOR
const isWarehouseStaff = (role: string) => ['TMC', 'STOREKEEPER', 'ADMIN', 'DIRECTOR'].includes(role);

// 1. Get current inventory
router.get('/inventory', async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (user.role === 'DEMO') {
        return res.json(DemoService.getMockInventory());
    }
    try {
        const userRole = user?.role;
        if (!isWarehouseStaff(userRole)) {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }

        const items = await prisma.warehouseItem.findMany({
            where: { quantity: { gt: 0 } },
            include: {
                nomenclature: true,
                batch: { include: { worker: { select: { fullName: true } } } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(items);
    } catch (e) {
        console.error('Error fetching inventory:', e);
        res.status(500).json({ error: 'Ошибка получения остатков' });
    }
});

// 2. Move items (change location)
router.post('/move', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!isWarehouseStaff(user.role)) {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }

        const { itemId, targetLocation, moveQty } = req.body;
        if (!itemId || !targetLocation || !moveQty) {
            return res.status(400).json({ error: 'Не все поля заполнены' });
        }

        const qtyToMove = parseInt(moveQty);
        if (qtyToMove <= 0) return res.status(400).json({ error: 'Количество должно быть > 0' });

        const item = await prisma.warehouseItem.findUnique({ where: { id: parseInt(itemId) } });
        if (!item || item.quantity < qtyToMove) {
            return res.status(400).json({ error: 'Недостаточно позиций на источнике' });
        }

        // Transaction for moving
        await prisma.$transaction(async (tx) => {
            // Log the move
            await tx.warehouseTransaction.create({
                data: {
                    type: 'MOVE',
                    nomId: item.nomId,
                    batchId: item.batchId,
                    quantity: qtyToMove,
                    fromLoc: item.location,
                    toLoc: targetLocation,
                    userId: user.id
                }
            });

            // Decrease quantity in source (or delete if all)
            const remaining = item.quantity - qtyToMove;
            if (remaining === 0) {
                await tx.warehouseItem.delete({ where: { id: item.id } });
            } else {
                await tx.warehouseItem.update({
                    where: { id: item.id },
                    data: { quantity: remaining }
                });
            }

            // check if target location already has same nomId/batchId/status
            const targetItem = await tx.warehouseItem.findFirst({
                where: {
                    nomId: item.nomId,
                    batchId: item.batchId,
                    location: targetLocation,
                    status: item.status
                }
            });

            if (targetItem) {
                await tx.warehouseItem.update({
                    where: { id: targetItem.id },
                    data: { quantity: targetItem.quantity + qtyToMove }
                });
            } else {
                await tx.warehouseItem.create({
                    data: {
                        nomId: item.nomId,
                        batchId: item.batchId,
                        location: targetLocation,
                        status: item.status,
                        quantity: qtyToMove
                    }
                });
            }
        });

        res.json({ success: true });
    } catch (e) {
        console.error('Error moving item:', e);
        res.status(500).json({ error: 'Ошибка при перемещении' });
    }
});

// 3. Manual item add
router.post('/add', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!isWarehouseStaff(user.role)) {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }

        const { nomId, quantity, location, batchId } = req.body;
        if (!nomId || !quantity || !location) {
            return res.status(400).json({ error: 'Заполните номенклатуру, локацию и количество' });
        }

        const qtyToMove = parseInt(quantity);
        if (qtyToMove <= 0) return res.status(400).json({ error: 'Количество должно быть > 0' });

        const parsedBatchId = batchId ? parseInt(batchId) : null;

        await prisma.$transaction(async (tx) => {
            const existing = await tx.warehouseItem.findFirst({
                where: {
                    nomId: parseInt(nomId),
                    batchId: parsedBatchId,
                    location: location,
                    status: 'AVAILABLE'
                }
            });

            if (existing) {
                await tx.warehouseItem.update({
                    where: { id: existing.id },
                    data: { quantity: existing.quantity + qtyToMove }
                });
            } else {
                await tx.warehouseItem.create({
                    data: {
                        nomId: parseInt(nomId),
                        batchId: parsedBatchId,
                        location: location,
                        status: 'AVAILABLE',
                        quantity: qtyToMove
                    }
                });
            }

            await tx.warehouseTransaction.create({
                data: {
                    type: 'INCOME',
                    nomId: parseInt(nomId),
                    batchId: parsedBatchId,
                    quantity: qtyToMove,
                    toLoc: location,
                    userId: user.id
                }
            });
        });

        res.json({ success: true });
    } catch (e) {
        console.error('Error adding item:', e);
        res.status(500).json({ error: 'Ошибка при доступе к складу' });
    }
});

export default router;
