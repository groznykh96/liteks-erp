import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import prisma from '../db';
const router = Router();

// Helper to check if user has required role
function hasRole(req: any, roles: string[]): boolean {
    return roles.includes(req.user?.role);
}

// Get all training materials (Admin / Director / Trainer)
router.get('/', authenticateToken, async (req: any, res) => {
    if (!hasRole(req, ['ADMIN', 'DIRECTOR', 'TRAINER'])) {
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

// Create new training material and assign to departments / specific users / roles
router.post('/', authenticateToken, async (req: any, res) => {
    if (!hasRole(req, ['ADMIN', 'DIRECTOR', 'TRAINER'])) {
        return res.status(403).json({ error: 'Доступ запрещён' });
    }
    try {
        const { title, description, fileUrl, testUrl, departments, roles, userIds } = req.body;

        if (!title || !fileUrl) {
            return res.status(400).json({ error: 'Title and File URL are required' });
        }

        const ROLE_LABELS: Record<string, string> = {
            'WORKER': 'Рабочий',
            'MASTER': 'Мастер',
            'TECHNOLOGIST': 'Технолог',
            'OTC': 'ОТК',
            'DIRECTOR': 'Директор',
            'ADMIN': 'Администратор',
            'SALES': 'Менеджер по продажам',
            'TRAINER': 'Учебный центр'
        };

        // Combine labels for display. If I have roles like "MASTER", we can format them?
        // Let's just store the arrays. We will store a combined array string.
        const combinedLabels: string[] = [];
        if (roles && Array.isArray(roles)) {
            roles.forEach((r: string) => combinedLabels.push(ROLE_LABELS[r] || r));
        }
        if (departments && Array.isArray(departments)) combinedLabels.push(...departments);

        // 1. Create the material
        const material = await prisma.trainingMaterial.create({
            data: {
                title,
                description: description || null,
                fileUrl,
                testUrl: testUrl || null,
                departments: combinedLabels.length > 0 ? JSON.stringify(combinedLabels) : null,
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

        // Add all users from selected roles
        if (roles && Array.isArray(roles) && roles.length > 0) {
            const roleUsers = await prisma.user.findMany({
                where: {
                    role: { in: roles },
                    isActive: true
                },
                select: { id: true }
            });
            roleUsers.forEach(u => usersToAssign.add(u.id));
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
    if (!hasRole(req, ['ADMIN', 'DIRECTOR', 'TRAINER'])) {
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

// Get relevant materials for the current user's role/department (Registry)
router.get('/materials/relevant', authenticateToken, async (req: any, res) => {
    try {
        const userRoleLabel = {
            'WORKER': 'Рабочий',
            'MASTER': 'Мастер',
            'TECHNOLOGIST': 'Технолог',
            'OTC': 'ОТК',
            'DIRECTOR': 'Директор',
            'ADMIN': 'Администратор',
            'SALES': 'Менеджер по продажам',
            'TRAINER': 'Учебный центр'
        }[req.user.role as string] || req.user.role;

        const userDept = req.user.department;

        const allMaterials = await prisma.trainingMaterial.findMany({
            orderBy: { createdAt: 'desc' }
        });

        const relevantMaterials = allMaterials.filter(m => {
            if (!m.departments) return false;
            try {
                const deps = JSON.parse(m.departments);
                return deps.includes(userRoleLabel) || (userDept && deps.includes(userDept));
            } catch (e) {
                return false;
            }
        });

        res.json(relevantMaterials);
    } catch (error: any) {
        console.error('Error fetching relevant materials:', error?.message);
        res.status(500).json({ error: 'Failed to fetch relevant materials' });
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

// Re-assign (reset) read status for a specific assignment
router.post('/assignments/:id/reset', authenticateToken, async (req: any, res) => {
    if (!hasRole(req, ['ADMIN', 'DIRECTOR', 'TRAINER'])) {
        return res.status(403).json({ error: 'Доступ запрещён' });
    }
    try {
        const assignmentId = parseInt(req.params.id);

        const updated = await prisma.trainingAssignment.update({
            where: { id: assignmentId },
            data: {
                status: 'PENDING',
                readAt: null
            }
        });

        res.json(updated);
    } catch (error: any) {
        console.error('Error resetting assignment:', error?.message);
        res.status(500).json({ error: 'Failed to reset assignment' });
    }
});

// Assign more users to an existing material
router.post('/:id/assign', authenticateToken, async (req: any, res) => {
    if (!hasRole(req, ['ADMIN', 'DIRECTOR', 'TRAINER'])) {
        return res.status(403).json({ error: 'Доступ запрещён' });
    }
    try {
        const materialId = parseInt(req.params.id);
        const { departments, roles, userIds } = req.body;

        const material = await prisma.trainingMaterial.findUnique({ where: { id: materialId } });
        if (!material) return res.status(404).json({ error: 'Material not found' });

        const usersToAssign = new Set<number>();

        if (userIds && Array.isArray(userIds)) {
            userIds.forEach((id: number) => usersToAssign.add(Number(id)));
        }

        if (departments && Array.isArray(departments) && departments.length > 0) {
            const deptUsers = await prisma.user.findMany({
                where: { department: { in: departments }, isActive: true },
                select: { id: true }
            });
            deptUsers.forEach(u => usersToAssign.add(u.id));
        }

        if (roles && Array.isArray(roles) && roles.length > 0) {
            const roleUsers = await prisma.user.findMany({
                where: { role: { in: roles }, isActive: true },
                select: { id: true }
            });
            roleUsers.forEach(u => usersToAssign.add(u.id));
        }

        if (usersToAssign.size > 0) {
            const assignmentsData = Array.from(usersToAssign).map(userId => ({
                userId,
                materialId,
                status: 'PENDING'
            }));
            await prisma.trainingAssignment.createMany({
                data: assignmentsData,
                skipDuplicates: true
            });
        }

        res.json({ success: true, count: usersToAssign.size });
    } catch (error: any) {
        console.error('Error assigning more users:', error?.message, error);
        res.status(500).json({ error: 'Failed to assign users' });
    }
});

// Get competency matrix (Director / Admin / Trainer)
router.get('/matrix', authenticateToken, async (req: any, res) => {
    if (!hasRole(req, ['ADMIN', 'DIRECTOR', 'TRAINER'])) {
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
    if (!hasRole(req, ['ADMIN', 'DIRECTOR', 'TRAINER'])) {
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
