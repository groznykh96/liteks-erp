import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// Get all training materials (Admin / Director)
router.get('/', authMiddleware, requireRole(['ADMIN', 'DIRECTOR']), async (req, res) => {
    try {
        const materials = await prisma.trainingMaterial.findMany({
            include: {
                assignments: {
                    include: {
                        user: { select: { id: true, fullName: true, department: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(materials);
    } catch (error) {
        console.error('Error fetching materials:', error);
        res.status(500).json({ error: 'Failed to fetch materials' });
    }
});

// Create new training material and assign to departments / users (Admin / Director)
router.post('/', authMiddleware, requireRole(['ADMIN', 'DIRECTOR']), async (req, res) => {
    try {
        const { title, description, fileUrl, departments, userIds } = req.body;

        if (!title || !fileUrl) {
            return res.status(400).json({ error: 'Title and File URL are required' });
        }

        // 1. Create the material
        const material = await prisma.trainingMaterial.create({
            data: {
                title,
                description,
                fileUrl,
                departments: departments ? JSON.stringify(departments) : null,
            }
        });

        // 2. Determine who to assign
        let usersToAssign = new Set<number>();

        if (userIds && Array.isArray(userIds)) {
            userIds.forEach(id => usersToAssign.add(id));
        }

        if (departments && Array.isArray(departments) && departments.length > 0) {
            const users = await prisma.user.findMany({
                where: {
                    department: { in: departments },
                    isActive: true
                },
                select: { id: true }
            });
            users.forEach(u => usersToAssign.add(u.id));
        }

        // Also if we want to assign to everyone, but normally we just rely on usersToAssign

        // 3. Create assignments
        const assignmentsData = Array.from(usersToAssign).map(userId => ({
            userId,
            materialId: material.id,
            status: 'PENDING'
        }));

        if (assignmentsData.length > 0) {
            await prisma.trainingAssignment.createMany({
                data: assignmentsData
            });
        }

        res.status(201).json(material);
    } catch (error) {
        console.error('Error creating material:', error);
        res.status(500).json({ error: 'Failed to create training material' });
    }
});

// Delete a training material
router.delete('/:id', authMiddleware, requireRole(['ADMIN', 'DIRECTOR']), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await prisma.trainingMaterial.delete({
            where: { id }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting material:', error);
        res.status(500).json({ error: 'Failed to delete material' });
    }
});

// Get assigned materials for the current user
router.get('/my', authMiddleware, async (req: any, res) => {
    try {
        const assignments = await prisma.trainingAssignment.findMany({
            where: { userId: req.user.id },
            include: {
                material: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(assignments);
    } catch (error) {
        console.error('Error fetching user assignments:', error);
        res.status(500).json({ error: 'Failed to fetch assignments' });
    }
});

// Mark a material as read
router.post('/my/:id/read', authMiddleware, async (req: any, res) => {
    try {
        const assignmentId = parseInt(req.params.id);

        // Check if the assignment belongs to the user
        const assignment = await prisma.trainingAssignment.findFirst({
            where: { id: assignmentId, userId: req.user.id }
        });

        if (!assignment) {
            return res.status(404).json({ error: 'Assignment not found' });
        }

        const updated = await prisma.trainingAssignment.update({
            where: { id: assignmentId },
            data: {
                status: 'READ',
                readAt: new Date()
            }
        });

        res.json(updated);
    } catch (error) {
        console.error('Error marking as read:', error);
        res.status(500).json({ error: 'Failed to mark as read' });
    }
});

// Get competency matrix (Director / Admin)
router.get('/matrix', authMiddleware, requireRole(['ADMIN', 'DIRECTOR']), async (req, res) => {
    try {
        // Fetch all active users
        const users = await prisma.user.findMany({
            where: { isActive: true },
            select: {
                id: true,
                fullName: true,
                role: true,
                department: true,
                trainingAssignments: {
                    select: {
                        materialId: true,
                        status: true,
                        readAt: true
                    }
                }
            },
            orderBy: [
                { department: 'asc' },
                { fullName: 'asc' }
            ]
        });

        // Fetch all materials
        const materials = await prisma.trainingMaterial.findMany({
            select: {
                id: true,
                title: true,
                departments: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ users, materials });
    } catch (error) {
        console.error('Error fetching matrix:', error);
        res.status(500).json({ error: 'Failed to fetch competency matrix' });
    }
});

export default router;
