import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { authenticateToken } from '../middlewares/authMiddleware';

const pool = new Pool({ connectionString: String(process.env.DATABASE_URL) });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const router = Router();

// Protect Data Routes with Auth
router.use(authenticateToken);

// --- MATERIALS ---
router.get('/materials', async (req: Request, res: Response) => {
    try {
        const data = await prisma.material.findMany();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: 'DB Error' });
    }
});
router.post('/materials', async (req: Request, res: Response) => {
    try {
        const { id, ...data } = req.body;
        if (id) {
            await prisma.material.update({ where: { id }, data });
        } else {
            await prisma.material.create({ data });
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'DB Error' });
    }
});
router.delete('/materials/:id', async (req: Request, res: Response) => {
    try {
        await prisma.material.delete({ where: { id: parseInt(req.params.id as string) } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'DB Error' });
    }
});

// --- ALLOYS ---
router.get('/alloys', async (req: Request, res: Response) => {
    try {
        const data = await prisma.alloy.findMany();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: 'DB Error' });
    }
});
router.post('/alloys', async (req: Request, res: Response) => {
    try {
        const { id, ...data } = req.body;
        if (id) {
            await prisma.alloy.update({ where: { id }, data });
        } else {
            await prisma.alloy.create({ data });
        }
        res.json({ success: true });
    } catch (e: any) {
        console.error('[Alloys POST Error]', e?.message || e);
        res.status(500).json({ error: 'DB Error', detail: e?.message });
    }
});
router.delete('/alloys/:id', async (req: Request, res: Response) => {
    try {
        await prisma.alloy.delete({ where: { id: parseInt(req.params.id as string) } });
        res.json({ success: true });
    } catch (e: any) {
        console.error('[Alloys DELETE Error]', e?.message || e);
        res.status(500).json({ error: 'DB Error', detail: e?.message });
    }
});

// --- NOMENCLATURE ---
router.get('/nomenclature', async (req: Request, res: Response) => {
    try {
        const data = await prisma.nomenclature.findMany({
            include: { castingMethod: true }
        });
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: 'DB Error' });
    }
});
router.post('/nomenclature', async (req: Request, res: Response) => {
    try {
        const { id, castingMethod, ...data } = req.body;

        // Ensure castingMethodId is an integer if provided
        if (data.castingMethodId !== undefined && data.castingMethodId !== null) {
            data.castingMethodId = parseInt(data.castingMethodId);
            if (isNaN(data.castingMethodId) || data.castingMethodId === 0) data.castingMethodId = null;
        }

        if (id) {
            await prisma.nomenclature.update({ where: { id }, data });
        } else {
            await prisma.nomenclature.create({ data });
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'DB Error' });
    }
});
router.delete('/nomenclature/:id', async (req: Request, res: Response) => {
    try {
        await prisma.nomenclature.delete({ where: { id: parseInt(req.params.id as string) } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'DB Error' });
    }
});

// --- MELTS ---
router.get('/melts', async (req: Request, res: Response) => {
    try {
        const data = await prisma.melt.findMany({
            include: {
                castings: true,
                conclusion: { include: { employee: true } }
            },
            orderBy: { id: 'desc' }
        });
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: 'DB Error' });
    }
});
router.post('/melts', async (req: Request, res: Response) => {
    try {
        const { id, meltNumber, date, alloyId, totalCost, meltMass, note, castings } = req.body;

        let melt;
        if (id) {
            // Check if exists
            const existing = await prisma.melt.findUnique({ where: { id: Number(id) } });
            if (existing) {
                melt = await prisma.melt.update({
                    where: { id: Number(id) },
                    data: { meltNumber, date, alloyId, totalCost, meltMass, note }
                });
                // Delete old castings and recreate
                await prisma.casting.deleteMany({ where: { meltId: Number(id) } });
            }
        }

        if (!melt) {
            melt = await prisma.melt.create({
                data: { meltNumber, date, alloyId, totalCost, meltMass, note }
            });
        }

        if (castings && castings.length > 0) {
            for (const c of castings) {
                await prisma.casting.create({
                    data: {
                        meltId: melt.id,
                        nomId: Number(c.nomId),
                        qty: Number(c.qty),
                        exitMassFact: String(c.exitMassFact || ''),
                        goodMassFact: String(c.goodMassFact || ''),
                        tvgFact: String(c.tvgFact || ''),
                        note: String(c.note || '')
                    }
                });
            }
        }

        res.json({ success: true, melt });
    } catch (e) {
        res.status(500).json({ error: 'DB Error' });
    }
});
router.delete('/melts/:id', async (req: Request, res: Response) => {
    try {
        await prisma.melt.delete({ where: { id: parseInt(req.params.id as string) } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'DB Error' });
    }
});

// --- MELT CONCLUSIONS ---
router.post('/melts/:id/conclusion', async (req: Request, res: Response) => {
    try {
        const meltId = parseInt(req.params.id as string);
        const { chemistryStatus, mechanicalStatus, finalVerdict, comments } = req.body;
        const employeeId = (req as any).user?.id;

        const conclusion = await prisma.meltConclusion.upsert({
            where: { meltId },
            update: { chemistryStatus, mechanicalStatus, finalVerdict, comments, employeeId },
            create: { meltId, chemistryStatus, mechanicalStatus, finalVerdict, comments, employeeId }
        });

        res.json(conclusion);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB Error saving conclusion' });
    }
});

// --- CASTING METHODS ---
router.get('/methods', async (req: Request, res: Response) => {
    try {
        const data = await prisma.castingMethod.findMany();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: 'DB Error' });
    }
});

export default router;
