import express, { Request, Response } from 'express';
import prisma from '../db';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = express.Router();

// Маршруты производственных этапов по методу литья
const STAGE_ROUTES: Record<string, string[]> = {
    KOKIL: ['CASTING', 'TRIMMING', 'QC', 'WAREHOUSE'],
    MLPD: ['CASTING', 'TRIMMING', 'QC', 'WAREHOUSE'],
    HTS: ['FORMING', 'POURING', 'KNOCKINGOUT', 'TRIMMING', 'FINISHING', 'HEAT_TREATMENT', 'QC', 'WAREHOUSE'],
};

// Роли, разрешённые для каждого этапа
const STAGE_ROLES: Record<string, string[]> = {
    CASTING: ['WORKER'],
    FORMING: ['MOULDER', 'WORKER'],
    POURING: ['POURER', 'WORKER'],
    KNOCKINGOUT: ['KNOCKER', 'WORKER'],
    TRIMMING: ['TRIMMER', 'WORKER'],
    FINISHING: ['FINISHER', 'WORKER'],
    HEAT_TREATMENT: ['WORKER', 'FINISHER'],
    QC: ['OTK', 'ADMIN'],
    WAREHOUSE: ['TMC', 'STOREKEEPER', 'ADMIN'],
};

const STAGE_LABELS: Record<string, string> = {
    CASTING: 'Литьё',
    FORMING: 'Формовка',
    POURING: 'Заливка',
    KNOCKINGOUT: 'Выбивка',
    TRIMMING: 'Обрубка',
    FINISHING: 'Доработка',
    HEAT_TREATMENT: 'Термообработка',
    QC: 'ОТК',
    WAREHOUSE: 'Склад',
};

function getNextStage(route: string, currentStage: string): string | null {
    const chain = STAGE_ROUTES[route] || [];
    const idx = chain.indexOf(currentStage);
    if (idx === -1 || idx >= chain.length - 1) return null;
    return chain[idx + 1];
}

const db = prisma as any;

// GET /api/stages/my
router.get('/my', authenticateToken, async (req: Request, res: Response) => {
    const user = (req as any).user;
    try {
        const allowedStages = Object.entries(STAGE_ROLES)
            .filter(([, roles]) => roles.includes(user.role))
            .map(([stage]) => stage);

        const stages = await db.productionStage.findMany({
            where: {
                status: { in: ['PENDING', 'IN_PROGRESS'] },
                stage: { in: allowedStages },
                OR: [
                    { workerId: user.id },
                    { workerId: null },
                ],
            },
            include: {
                batch: {
                    include: {
                        task: {
                            include: { nomenclature: true, method: true },
                        },
                        stages: {
                            include: { worker: { select: { id: true, fullName: true } } },
                            orderBy: { id: 'asc' },
                        },
                    },
                },
                worker: { select: { id: true, fullName: true, role: true } },
            },
            orderBy: { id: 'asc' },
        });

        res.json(stages.map((s: any) => ({
            ...s,
            stageLabel: STAGE_LABELS[s.stage] || s.stage,
            nextStage: s.batch.route ? getNextStage(s.batch.route, s.stage) : null,
            nextStageLabel: s.batch.route
                ? STAGE_LABELS[getNextStage(s.batch.route, s.stage) || ''] || null
                : null,
            batch: {
                ...s.batch,
                stages: s.batch.stages.map((st: any) => ({
                    ...st,
                    stageLabel: STAGE_LABELS[st.stage] || st.stage,
                })),
            },
        })));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/stages/:id/start
router.post('/:id/start', authenticateToken, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const stageId = parseInt(req.params.id as string);
    try {
        const stage = await db.productionStage.findUnique({ where: { id: stageId } });
        if (!stage) return res.status(404).json({ error: 'Этап не найден' });
        if (stage.status === 'DONE') return res.status(400).json({ error: 'Этап уже завершён' });

        const updated = await db.productionStage.update({
            where: { id: stageId },
            data: { status: 'IN_PROGRESS', workerId: user.id, startedAt: new Date() },
        });
        res.json(updated);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/stages/:id/complete
router.post('/:id/complete', authenticateToken, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const stageId = parseInt(req.params.id as string);
    const { qtyOut, qtyRejected, note, newBatchNumber } = req.body;

    if (qtyOut === undefined || qtyOut === null) {
        return res.status(400).json({ error: 'Укажите количество годных (qtyOut)' });
    }

    try {
        const stage = await db.productionStage.findUnique({
            where: { id: stageId },
            include: { batch: true },
        });
        if (!stage) return res.status(404).json({ error: 'Этап не найден' });
        if (stage.status === 'DONE') return res.status(400).json({ error: 'Этап уже завершён' });

        const batch = stage.batch;
        const route = batch.route || 'KOKIL';
        const nextStageName = getNextStage(route, stage.stage);
        const qtyGood = parseInt(qtyOut);
        const qtyBad = qtyRejected ? parseInt(qtyRejected) : 0;

        await prisma.$transaction(async (tx: any) => {
            await tx.productionStage.update({
                where: { id: stageId },
                data: {
                    status: 'DONE',
                    workerId: user.id,
                    completedAt: new Date(),
                    qtyOut: qtyGood,
                    qtyRejected: qtyBad,
                    note: note || null,
                },
            });

            if (newBatchNumber) {
                const exist = await tx.batch.findUnique({ where: { batchNumber: newBatchNumber } });
                if (exist) throw new Error('DUPLICATE_BATCH');

                await tx.batch.update({
                    where: { id: batch.id },
                    data: { batchNumber: newBatchNumber }
                });
            }

            if (nextStageName) {
                const nextStage = await tx.productionStage.findFirst({
                    where: { batchId: batch.id, stage: nextStageName, status: 'PENDING' },
                });
                if (nextStage) {
                    await tx.productionStage.update({
                        where: { id: nextStage.id },
                        data: { qtyIn: qtyGood },
                    });
                }
                await tx.batch.update({
                    where: { id: batch.id },
                    data: { currentStage: nextStageName },
                });
            }
        });

        res.json({
            success: true,
            nextStage: nextStageName,
            nextStageLabel: STAGE_LABELS[nextStageName || ''] || null,
        });
    } catch (e: any) {
        console.error(e);
        if (e.message === 'DUPLICATE_BATCH') {
            return res.status(409).json({ error: 'Партия с таким номером уже существует' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/stages/board
router.get('/board', authenticateToken, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const isManagement = ['MASTER', 'DIRECTOR', 'ADMIN'].includes(user.role);

    // Determine which stages this user's role can work on
    const allowedStages = Object.entries(STAGE_ROLES)
        .filter(([, roles]) => roles.includes(user.role))
        .map(([stage]) => stage);

    try {
        // Build where clause: management sees all, workers see only their batches
        const whereClause: any = {
            stages: { some: { status: { in: ['PENDING', 'IN_PROGRESS'] } } },
        };

        if (!isManagement) {
            // Workers see batches where they are assigned to a stage OR
            // the batch has stages matching their allowed stage types
            whereClause.stages = {
                some: {
                    OR: [
                        { workerId: user.id },
                        { stage: { in: allowedStages }, workerId: null },
                        { stage: { in: allowedStages }, status: { in: ['PENDING', 'IN_PROGRESS'] } },
                    ],
                },
            };
        }

        const batches = await (prisma as any).batch.findMany({
            where: whereClause,
            include: {
                task: { include: { nomenclature: true, method: true } },
                worker: { select: { id: true, fullName: true } },
                stages: {
                    include: { worker: { select: { id: true, fullName: true, role: true } } },
                    orderBy: { id: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(batches.map((b: any) => ({
            ...b,
            currentStageLabel: STAGE_LABELS[b.currentStage || ''] || b.currentStage,
            stages: b.stages.map((s: any) => ({
                ...s,
                stageLabel: STAGE_LABELS[s.stage] || s.stage,
            })),
        })));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/stages/stats
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!['MASTER', 'DIRECTOR', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ error: 'Нет доступа' });
    }
    const { from, to } = req.query;
    try {
        const fromStr = typeof from === 'string' ? from : undefined;
        const toStr = typeof to === 'string' ? to : undefined;

        const stages = await db.productionStage.findMany({
            where: {
                status: 'DONE',
                completedAt: {
                    gte: fromStr ? new Date(fromStr) : undefined,
                    lte: toStr ? new Date(toStr) : undefined,
                },
            },
            include: {
                worker: { select: { id: true, fullName: true, role: true } },
                batch: { include: { task: { include: { nomenclature: true, method: true } } } },
            },
        });

        const byStage: Record<string, any> = {};
        const byWorker: Record<string, any> = {};

        for (const s of stages) {
            if (!byStage[s.stage]) byStage[s.stage] = { qtyIn: 0, qtyOut: 0, qtyRejected: 0, count: 0 };
            byStage[s.stage].qtyIn += s.qtyIn || 0;
            byStage[s.stage].qtyOut += s.qtyOut || 0;
            byStage[s.stage].qtyRejected += s.qtyRejected || 0;
            byStage[s.stage].count++;

            if (s.workerId && s.worker) {
                const wid = String(s.workerId);
                if (!byWorker[wid]) byWorker[wid] = { name: s.worker.fullName, role: s.worker.role, processed: 0, rejected: 0 };
                byWorker[wid].processed += s.qtyOut || 0;
                byWorker[wid].rejected += s.qtyRejected || 0;
            }
        }

        res.json({
            byStage: Object.entries(byStage).map(([stage, data]) => ({
                stage, stageLabel: STAGE_LABELS[stage] || stage, ...data,
            })),
            byWorker: Object.entries(byWorker).map(([id, data]) => ({ workerId: id, ...data })),
            total: stages.length,
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/stages/:id/assign — мастер назначает рабочего на этап
router.put('/:id/assign', authenticateToken, async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ error: 'Нет доступа' });
    }
    const stageId = parseInt(req.params.id as string);
    const { workerId } = req.body;
    try {
        const updated = await db.productionStage.update({
            where: { id: stageId },
            data: { workerId: workerId ? parseInt(workerId) : null },
        });
        res.json(updated);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
