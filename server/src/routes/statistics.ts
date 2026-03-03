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

// GET /api/statistics/defects — aggregated from QCReport
router.get('/defects', async (req: Request, res: Response) => {
    try {
        const reports = await prisma.qCReport.findMany({
            where: { rejectedQty: { gt: 0 } },
            include: {
                batch: {
                    include: {
                        worker: { select: { department: true, fullName: true } }
                    }
                },
                inspector: { select: { fullName: true } }
            }
        });

        const byDepartment: Record<string, number> = {};
        let totalDefects = 0;

        reports.forEach(r => {
            const dept = r.batch?.worker?.department || 'Не указан';
            byDepartment[dept] = (byDepartment[dept] || 0) + r.rejectedQty;
            totalDefects += r.rejectedQty;
        });

        res.json({
            byDepartment: Object.entries(byDepartment).map(([name, value]) => ({ name, value })),
            total: totalDefects,
            raw: reports
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB Error getting defect statistics' });
    }
});

// GET /api/statistics/costs
router.get('/costs', async (req: Request, res: Response) => {
    try {
        const melts = await prisma.melt.findMany({
            include: {
                alloy: true,
                castings: {
                    include: {
                        nomenclature: true
                    }
                }
            },
            orderBy: { id: 'desc' },
            take: 100
        });

        const costData = melts.map(m => {
            // calc total good mass
            let totalGoodMass = 0;
            m.castings.forEach(c => {
                const goodMass = parseFloat(c.goodMassFact || '0');
                if (!isNaN(goodMass) && goodMass > 0) {
                    totalGoodMass += goodMass * c.qty;
                } else if (c.nomenclature?.goodMass) {
                    totalGoodMass += c.nomenclature.goodMass * c.qty;
                }
            });

            const costPerKg = totalGoodMass > 0 ? (m.totalCost / totalGoodMass).toFixed(2) : 0;

            return {
                id: m.id,
                meltNumber: m.meltNumber,
                date: m.date,
                alloy: m.alloy.name,
                totalCost: m.totalCost,
                totalGoodMass: parseFloat(totalGoodMass.toFixed(2)),
                costPerKg: parseFloat(costPerKg as string)
            };
        });

        res.json(costData);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB Error getting cost statistics' });
    }
});

// GET /api/statistics/productivity
router.get('/productivity', async (req: Request, res: Response) => {
    try {
        const batches = await prisma.batch.findMany({
            include: {
                worker: true,
                task: {
                    include: {
                        nomenclature: true
                    }
                }
            }
        });

        const byDepartment: Record<string, number> = {};

        batches.forEach(b => {
            const dept = b.worker?.department || 'Не указан';
            // mass: completedQuantity * weight of one item
            const mass = b.completedQuantity * (b.task?.nomenclature?.goodMass || 1);
            byDepartment[dept] = (byDepartment[dept] || 0) + mass;
        });

        res.json({
            byDepartment: Object.entries(byDepartment).map(([name, value]) => ({ name, value: Math.round(value) }))
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB Error getting productivity statistics' });
    }
});
// GET /api/statistics/workers
router.get('/workers', async (req: Request, res: Response) => {
    try {
        // Collect all batches to get melts and total quantities, and also all QC reports for accepted/rejected
        const batches = await prisma.batch.findMany({
            include: {
                worker: true,
                qcReports: {
                    include: {
                        guiltyWorker: true
                    }
                }
            }
        });

        // Collect all QC reports directly where guiltyWorkerId is mapped
        const reports = await prisma.qCReport.findMany({
            where: { rejectedQty: { gt: 0 }, guiltyWorkerId: { not: null } },
            include: { guiltyWorker: true }
        });

        const workerStats: Record<number, any> = {};

        // Aggregate by Batch worker
        batches.forEach(b => {
            const wId = b.workerId;
            if (!workerStats[wId]) {
                workerStats[wId] = {
                    id: wId,
                    fullName: b.worker.fullName,
                    department: b.worker.department || 'Не указан',
                    totalMelts: 0,
                    acceptedQty: 0,
                    rejectedQty: 0
                };
            }
            workerStats[wId].totalMelts += (b.meltsCount || 1);

            // Note: accepted / rejected is better taken from qcReports, but if not inspected, we might count nothing.
            // Let's assume accepted if no QC, or count from QC if it exists.
            if (b.qcReports && b.qcReports.length > 0) {
                // If there's a QC report, we only add accepted here.
                // Rejected will be added by the guilty worker calculation below.
                workerStats[wId].acceptedQty += b.qcReports[0].acceptedQty;
            } else {
                // Not inspected yet or no QC, assume accepted for productivity? Nah, better purely what's verified?
                // Or maybe just sum completedQuantity as submitted?
                // Let's sum submitting completedQuantity as 'submitted', but keep accepted separate.
            }
        });

        // Add Rejected Qty specifically to the GUILTY worker
        reports.forEach(r => {
            if (r.guiltyWorkerId) {
                if (!workerStats[r.guiltyWorkerId]) {
                    workerStats[r.guiltyWorkerId] = {
                        id: r.guiltyWorkerId,
                        fullName: r.guiltyWorker?.fullName || 'Рабочий',
                        department: r.guiltyWorker?.department || 'Не указан',
                        totalMelts: 0,
                        acceptedQty: 0,
                        rejectedQty: 0
                    };
                }
                workerStats[r.guiltyWorkerId].rejectedQty += r.rejectedQty;
            }
        });

        res.json(Object.values(workerStats));

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB Error getting worker statistics' });
    }
});

export default router;
