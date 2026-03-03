import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// Helper to check if user has required role
function hasRole(req: any, roles: string[]): boolean {
    return roles.includes(req.user?.role);
}

// Get all training materials (Admin / Director)
router.get('/', authenticateToken, async (req: any, res) => {
    if (!hasRole(req, ['ADMIN', 'DIRECTOR'])) {
        return res.status(403).json({ error: 'Доступ запрещён' });
    }
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
    } catch (error: any) {
        console.error('Error fetching materials:', error?.message);
        res.status(500).json({ error: 'Failed to fetch materials' });
    }
});

// Create new training material and assign to departments / specific users
router.post('/', authenticateToken, async (req: any, res) => {
    if (!hasRole(req, ['ADMIN', 'DIRECTOR'])) {
        return res.status(403).json({ error: 'Доступ запрещён' });
    }
    try {
        const { title, description, fileUrl, departments, userIds } = req.body;

        if (!title || !fileUrl) {
            return res.status(400).json({ error: 'Title and File URL are required' });
        }

        // 1. Create the material
        const material = await prisma.trainingMaterial.create({
            data: {
                title,
                description: description || null,
                fileUrl,
                departments: departments && departments.length > 0 ? JSON.stringify(departments) : null,
            }
        });

        // 2. Determine who to assign
        const usersToAssign = new Set<number>();

        // Add individually selected users
        if (userIds && Array.isArray(userIds)) {
            userIds.forEach((id: number) => usersToAssign.add(Number(id)));
        }

        // Add all users from selected departments
        if (departments && Array.isArray(departments) && departments.length > 0) {
            const deptUsers = await prisma.user.findMany({
                where: {
                    department: { in: departments },
                    isActive: true
                },
                select: { id: true }
            });
            deptUsers.forEach(u => usersToAssign.add(u.id));
        }

        // 3. Create assignments (skip duplicates)
        if (usersToAssign.size > 0) {
            const assignmentsData = Array.from(usersToAssign).map(userId => ({
                userId,
                materialId: material.id,
                status: 'PENDING'
            }));
            await prisma.trainingAssignment.createMany({
                data: assignmentsData,
                skipDuplicates: true
            });
        }

        res.status(201).json(material);
    } catch (error: any) {
        console.error('Error creating material:', error?.message, error);
        res.status(500).json({ error: 'Failed to create training material', detail: error?.message });
    }
});

// Delete a training material
router.delete('/:id', authenticateToken, async (req: any, res) => {
    if (!hasRole(req, ['ADMIN', 'DIRECTOR'])) {
        return res.status(403).json({ error: 'Доступ запрещён' });
    }
    try {
        const id = parseInt(req.params.id);
        // Delete assignments first
        await prisma.trainingAssignment.deleteMany({ where: { materialId: id } });
        await prisma.trainingMaterial.delete({ where: { id } });
        res.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting material:', error?.message);
        res.status(500).json({ error: 'Failed to delete material' });
    }
});

// Get assigned materials for the current user
router.get('/my', authenticateToken, async (req: any, res) => {
    try {
        const assignments = await prisma.trainingAssignment.findMany({
            where: { userId: req.user.id },
            include: {
                material: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(assignments);
    } catch (error: any) {
        console.error('Error fetching user assignments:', error?.message);
        res.status(500).json({ error: 'Failed to fetch assignments' });
    }
});

// Mark a material as read
router.post('/my/:id/read', authenticateToken, async (req: any, res) => {
    try {
        const assignmentId = parseInt(req.params.id);

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
    } catch (error: any) {
        console.error('Error marking as read:', error?.message);
        res.status(500).json({ error: 'Failed to mark as read' });
    }
});

// Get competency matrix (Director / Admin)
router.get('/matrix', authenticateToken, async (req: any, res) => {
    if (!hasRole(req, ['ADMIN', 'DIRECTOR'])) {
        return res.status(403).json({ error: 'Доступ запрещён' });
    }
    try {
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

        const materials = await prisma.trainingMaterial.findMany({
            select: { id: true, title: true, departments: true },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ users, materials });
    } catch (error: any) {
        console.error('Error fetching matrix:', error?.message);
        res.status(500).json({ error: 'Failed to fetch competency matrix' });
    }
});

// Get all users list (for Admin assignment form)
router.get('/users-list', authenticateToken, async (req: any, res) => {
    if (!hasRole(req, ['ADMIN', 'DIRECTOR'])) {
        return res.status(403).json({ error: 'Доступ запрещён' });
    }
    try {
        const users = await prisma.user.findMany({
            where: { isActive: true },
            select: { id: true, fullName: true, department: true, role: true },
            orderBy: [{ department: 'asc' }, { fullName: 'asc' }]
        });
        res.json(users);
    } catch (error: any) {
        console.error('Error fetching users list:', error?.message);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

export default router;
