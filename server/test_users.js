const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log(users.map(u => ({ id: u.id, login: u.login, role: u.role, fullName: u.fullName })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
