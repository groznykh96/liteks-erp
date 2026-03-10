import prisma from './src/db';
import bcrypt from 'bcrypt';

async function main() {
  const hashedPassword = await bcrypt.hash('demo', 10);
  const user = await prisma.user.upsert({
    where: { login: 'demo' },
    update: { role: 'DEMO', passwordHash: hashedPassword, fullName: 'Демо-пользователь' },
    create: { login: 'demo', passwordHash: hashedPassword, role: 'DEMO', fullName: 'Демо-пользователь' }
  });
  console.log('Demo user created/updated:', user.login);
}

main().catch(console.error).finally(() => process.exit(0));
