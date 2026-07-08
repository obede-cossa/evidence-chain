import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);
  const users = [
    { name: 'Administrador', email: 'admin@policia.gov.mz', role: Role.ADMIN },
    { name: 'Inv. Carlos Macuacua', email: 'investigador@policia.gov.mz', role: Role.INVESTIGATOR },
    { name: 'Perito Ana Sitoe', email: 'perito@policia.gov.mz', role: Role.EXPERT },
    { name: 'Sup. Julio Mondlane', email: 'supervisor@policia.gov.mz', role: Role.SUPERVISOR },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: password },
    });
  }
  console.log('Seed concluido. Password de todos os utilizadores: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
