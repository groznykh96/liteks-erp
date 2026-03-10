const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
    console.log('--- Starting Role Migration ---');

    // 1. Normalize User table
    const usersToUpdate = await prisma.user.findMany({
        where: {
            role: { in: ['TECH', 'OTK'] }
        }
    });

    for (const user of usersToUpdate) {
        const newRole = user.role === 'TECH' ? 'TECHNOLOGIST' : 'OTC';
        await prisma.user.update({
            where: { id: user.id },
            data: { role: newRole }
        });
        console.log(`[USER] Updated ${user.login}: ${user.role} -> ${newRole}`);
    }

    // 2. Normalize InstructionPage table
    const pagesToUpdate = await prisma.instructionPage.findMany({
        where: {
            roleKey: { in: ['TECH', 'OTK'] }
        }
    });

    for (const page of pagesToUpdate) {
        const newKey = page.roleKey === 'TECH' ? 'TECHNOLOGIST' : 'OTC';
        
        // Check if the target key already exists
        const exists = await prisma.instructionPage.findUnique({
            where: { roleKey: newKey }
        });

        if (exists) {
            console.log(`[PAGE] New key ${newKey} already exists. Merging content...`);
            await prisma.instructionPage.update({
                where: { id: exists.id },
                data: { content: page.content + '\n\n' + exists.content }
            });
            await prisma.instructionPage.delete({ where: { id: page.id } });
        } else {
            await prisma.instructionPage.update({
                where: { id: page.id },
                data: { roleKey: newKey }
            });
            console.log(`[PAGE] Renamed ${page.roleKey} -> ${newKey}`);
        }
    }

    console.log('✅ Migration completed.');
}

migrate()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
