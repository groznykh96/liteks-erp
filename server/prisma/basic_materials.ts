import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: String(process.env.DATABASE_URL) });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const materials = [
        { name: 'Лом Алюминия (смесь)', price: 150, assimilation: 90, Al: 95.0, Si: 2.0, Cu: 1.0, Fe: 0.8 },
        { name: 'Лом Медный (смесь)', price: 700, assimilation: 95, Cu: 95.0 },
        { name: 'Возврат Алюминиевый', price: 100, assimilation: 95, Al: 90.0, Si: 5.0, Cu: 2.0, Fe: 0.5 },
        { name: 'Возврат Медный', price: 600, assimilation: 95, Cu: 90.0 },
        { name: 'Чушковый Алюминий А99', price: 250, assimilation: 98, Al: 99.9, Fe: 0.1 },
        { name: 'Чушковая Медь М00', price: 850, assimilation: 98, Cu: 99.95 },
        { name: 'Чушковый Силумин Сил-1', price: 220, assimilation: 95, Al: 88.0, Si: 11.0, Fe: 0.5 },
        { name: 'Ферросилиций ФС45', price: 150, assimilation: 85, Si: 45.0, Fe: 53.0, C: 0.2, Al: 1.0 },
        { name: 'Ферромарганец ФМн78', price: 180, assimilation: 85, Mn: 78.0, Fe: 15.0, C: 6.0, Si: 1.0 },
        { name: 'Феррохром ФХ800', price: 250, assimilation: 85, Cr: 65.0, Fe: 25.0, C: 8.0, Si: 1.5 }
    ];

    for (const m of materials) {
        const existing = await prisma.material.findFirst({ where: { name: m.name } });
        if (existing) {
            await prisma.material.update({ where: { id: existing.id }, data: m });
            console.log(`Updated ${m.name}`);
        } else {
            await prisma.material.create({ data: m });
            console.log(`Added ${m.name}`);
        }
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
