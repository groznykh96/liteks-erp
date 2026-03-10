const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const login = 'demo_user';
    const password = 'demo_password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { login },
        update: {
            role: 'DEMO',
            fullName: 'Демонстрационный Пользователь'
        },
        create: {
            login,
            passwordHash: hashedPassword,
            role: 'DEMO',
            fullName: 'Демонстрационный Пользователь',
            department: 'Отдел маркетинга'
        }
    });

    console.log(`Demo user created/updated: ${user.login}`);

    // Create a few default slides if they don't exist
    const slidesCount = await prisma.demoSlide.count();
    if (slidesCount === 0) {
        await prisma.demoSlide.createMany({
            data: [
                {
                    title: 'Добро пожаловать в ERP ЛитТех',
                    content: 'Эта система позволяет управлять процессами литейного производства в реальном времени.',
                    sortOrder: 0,
                    imageUrl: 'https://images.unsplash.com/photo-1504917595217-d4dc5f661d40?auto=format&fit=crop&q=80&w=2000'
                },
                {
                    title: 'Управление заказами',
                    content: 'Отслеживайте состояние плавок, готовность отливок и сроки отгрузки.',
                    sortOrder: 1,
                    imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=2000'
                },
                {
                    title: 'Склад и логистика',
                    content: 'Полный контроль остатков материалов, шихтовых материалов и готовой продукции.',
                    sortOrder: 2,
                    imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad86d02b339f?auto=format&fit=crop&q=80&w=2000'
                }
            ]
        });
        console.log('Created default slides');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
