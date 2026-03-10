const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInstructions() {
    const roles = ['ADMIN', 'DIRECTOR', 'MASTER', 'TECH', 'OTK', 'SALES', 'TRAINER', 'TMC', 'STOREKEEPER', 'WORKER'];
    const instructions = await prisma.instructionPage.findMany();

    console.log('--- Instruction Audit ---');
    roles.forEach(role => {
        const inst = instructions.find(i => i.roleKey === role);
        if (inst) {
            console.log(`[OK] ${role}: ${inst.title} (${inst.content.length} chars)`);
        } else {
            console.log(`[MISSING] ${role}: No instruction page found`);
        }
    });

    // Check for "stages" specific instructions if any
    const stages = ['ПОДГОТОВКА', 'ПЛАВКА', 'ВЫБИВКА', 'ТЕРМООБРАБОТКА', 'МЕХОБРАБОТКА', 'ОТК', 'ОТГРУЗКА'];
    // These might be part of the general role instructions, but let's see if there are specific keys
    const otherKeys = instructions.filter(i => !roles.includes(i.roleKey));
    if (otherKeys.length > 0) {
        console.log('\n--- Other Instructions ---');
        otherKeys.forEach(k => console.log(`- ${k.roleKey}: ${k.title}`));
    }
}

checkInstructions()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
