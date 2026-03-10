import prisma from './src/db';

async function main() {
  const users = await prisma.user.findMany();
  console.log(users.map(u => ({ id: u.id, login: u.login, role: u.role })));
}

main().catch(console.error).finally(() => process.exit(0));
