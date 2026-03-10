
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LABEL_MAP = {
    'Рабочий': 'Рабочий (Общий)',
    'Мастер': 'Мастер участка',
    'ОТК': 'Контролёр ОТК',
    'Менеджер по продажам': 'Менеджер продаж',
    'Директор': 'Руководитель'
};

async function main() {
    const materials = await prisma.trainingMaterial.findMany();
    console.log(`Found ${materials.length} materials`);

    for (const m of materials) {
        if (!m.departments) continue;
        try {
            let deps = JSON.parse(m.departments);
            if (!Array.isArray(deps)) continue;

            let updated = false;
            const newDeps = deps.map(d => {
                if (LABEL_MAP[d]) {
                    updated = true;
                    return LABEL_MAP[d];
                }
                return d;
            });

            if (updated) {
                console.log(`Updating material ${m.id}: ${deps} -> ${newDeps}`);
                await prisma.trainingMaterial.update({
                    where: { id: m.id },
                    data: { departments: JSON.stringify(newDeps) }
                });
            }
        } catch (e) {
            console.error(`Error parsing departments for material ${m.id}`, e);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
