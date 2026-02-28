import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Criar usuário de teste
  const passwordHash = await bcrypt.hash('teste123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'teste@pixlyzer.com' },
    update: {},
    create: {
      email: 'teste@pixlyzer.com',
      passwordHash,
      plan: 'FREE',
    },
  });

  console.log('Created user:', user.email);

  // Criar API key para o usuário
  const apiKey = await prisma.apiKey.create({
    data: {
      keyHash: await bcrypt.hash('sk_live_test_key_12345', 12),
      userId: user.id,
      monthlyLimit: 10,
    },
  });

  console.log('Created API key:', apiKey.id);

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
