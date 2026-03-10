const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const roles = await prisma.user.groupBy({
        by: ['role'],
        _count: { id: true }
    });
    console.log('User Role Counts:', roles);

    const instructionRoles = await prisma.instructionPage.findMany({
        select: { roleKey: true }
    });
    console.log('Instruction Page Roles:', instructionRoles.map(p => p.roleKey));
}

main().catch(err => {
    console.error(err);
    process.exit(1);
}).finally(() => prisma.$disconnect());
