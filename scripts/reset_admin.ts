import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function reset() {
  console.log('Limpando base de dados...');

  await prisma.comment.deleteMany();
  await prisma.libraryItem.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.book.deleteMany();
  await prisma.user.deleteMany();

  console.log('Tabelas limpas.');

  // SEGURANÇA: senha lida de variável de ambiente (nunca no código)
  const ADMIN_SENA = process.env.ADMIN_SENA_INICIAL;
  if (!ADMIN_SENA) {
    console.error('Defina ADMIN_SENA_INICIAL no .env.local');
    process.exit(1);
  }
  const senha_hash = await bcrypt.hash(ADMIN_SENA, 12);
  const admin = await prisma.user.create({
    data: {
      nome: 'Filomeno',
      email: process.env.ADMIN_EMAIL || 'admin@exemplo.local',
      senha_hash,
      role: 'ADMIN',
      saldo_carteira: 1000,
      biografia: 'Administrador da plataforma MozLit.',
      avatar_url: '',
    },
  });

  console.log('Admin criado com sucesso!');
  console.log(`  ID: ${admin.id}`);
  console.log(`  Nome: ${admin.nome}`);
  console.log(`  Email: ${admin.email}`);
  console.log(`  Role: ${admin.role}`);
  console.log(`  Saldo: ${admin.saldo_carteira} MZN`);

  await prisma.$disconnect();
}

reset().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
