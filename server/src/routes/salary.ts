import { DemoService } from '../services/demoService';

const router = Router();
router.use(authenticateToken);

const isTMC = (role: string) => ['TMC', 'ADMIN', 'DIRECTOR', 'DEMO'].includes(role);

// 1. Production report for salary calculation
router.get('/report', async (req: Request, res: Response) => {
    try {
        if ((req as any).user?.role === 'DEMO') {
            return res.json(DemoService.getMockSalary());
        }
        const user = (req as any).user;
        if (!isTMC(user.role)) return res.status(403).json({ error: 'Только специалист ТМЦ может просматривать отчет по зарплате' });

        const { startDate, endDate, workerId } = req.query;

        const whereFilters: any = {};

        if (startDate && endDate) {
            whereFilters.createdAt = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string)
            };
        }
        if (workerId) {
            whereFilters.workerId = parseInt(workerId as string);
        }

        const batches = await prisma.batch.findMany({
            where: whereFilters,
            include: {
                worker: { select: { id: true, fullName: true, department: true } },
                task: {
                    include: {
                        nomenclature: true
                    }
                },
                qcReports: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Group by worker
        const report = batches.reduce((acc: any, batch) => {
            const workerId = batch.worker.id;
            if (!acc[workerId]) {
                acc[workerId] = {
                    worker: batch.worker,
                    totalCompleted: 0,
                    totalAcceptedQA: 0,
                    totalRejectedQA: 0,
                    batches: []
                };
            }

            const acceptedQty = batch.qcReports.reduce((sum, r) => sum + r.acceptedQty, 0);
            const rejectedQty = batch.qcReports.reduce((sum, r) => sum + r.rejectedQty, 0);

            acc[workerId].totalCompleted += batch.completedQuantity;
            acc[workerId].totalAcceptedQA += acceptedQty;
            acc[workerId].totalRejectedQA += rejectedQty;

            acc[workerId].batches.push({
                batchNumber: batch.batchNumber,
                nomenclatureName: batch.task.nomenclature.name,
                completedQuantity: batch.completedQuantity,
                acceptedQty,
                rejectedQty,
                date: batch.createdAt
            });

            return acc;
        }, {});

        res.json(Object.values(report));
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка получения отчета: ' + e.message });
    }
});

export default router;
