import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: String(process.env.DATABASE_URL) });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    // 1. Create Default Methods
    const methods = ['ХТС', 'Литье в кокиль', 'Литье МЛПД'];
    for (const m of methods) {
        await prisma.castingMethod.upsert({
            where: { name: m },
            update: {},
            create: { name: m }
        });
    }

    // 2. Create Admin User
    const adminLogin = 'admin';
    const adminPassword = '123';

    const existingAdmin = await prisma.user.findUnique({ where: { login: adminLogin } });
    if (!existingAdmin) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(adminPassword, salt);

        await prisma.user.create({
            data: {
                login: adminLogin,
                passwordHash: hash,
                fullName: 'Администратор Системы',
                role: 'ADMIN',
                department: 'Управление'
            }
        });
        console.log('✅ Created Admin User (admin / 123)');
    } else {
        console.log('ℹ️ Admin user already exists.');
    }

    console.log('✅ Seed complete.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
