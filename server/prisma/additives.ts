import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: String(process.env.DATABASE_URL) });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const additives = [
        { name: 'Лигатура AlTi5C1', price: 1500, assimilation: 95, Ti: 5.0, C: 1.0, Al: 94.0 },
        { name: 'Лигатура AlSr10', price: 2000, assimilation: 90, Sr: 10.0, Al: 90.0 },
        { name: 'Кремний Кр0 (Si 99%)', price: 300, assimilation: 85, Si: 99.0, Fe: 0.5, Al: 0.4 },
        { name: 'Медь М1 (Cu 99.9%)', price: 800, assimilation: 95, Cu: 99.9 },
        { name: 'Магний Мг90 (Mg 99.9%)', price: 400, assimilation: 80, Mg: 99.9 },
        { name: 'Лигатура AlCu50', price: 600, assimilation: 95, Cu: 50.0, Al: 50.0 }
    ];

    for (const a of additives) {
        const exists = await prisma.material.findFirst({ where: { name: a.name } });
        if (!exists) {
            await prisma.material.create({ data: a });
            console.log(`Added ${a.name}`);
        } else {
            console.log(`Already exists: ${a.name}`);
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
