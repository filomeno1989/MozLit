/**
 * Gera prisma/schema.dev.prisma — variante SQLite do schema principal
 * para desenvolvimento/testes locais (produção usa PostgreSQL/Supabase).
 *
 * Uso: node scripts/dev-db.mjs && bunx prisma generate --schema prisma/schema.dev.prisma && bunx prisma db push --schema prisma/schema.dev.prisma
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(process.cwd());
const src = fs.readFileSync(path.join(root, 'prisma', 'schema.prisma'), 'utf8');

let out = src
  // datasource: sqlite sem directUrl
  .replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"')
  .replace(/^\s*directUrl\s*=.*$/m, '')
  // tipos PostgreSQL → SQLite
  .replace(/\s+@db\.Uuid/g, '')
  .replace(/\s+@db\.Timestamptz\(6\)/g, '')
  .replace(/\s+@db\.Date/g, '')
  // default UUID gerado pela BD → gerado pelo Prisma
  .replace(/@default\(dbgenerated\("gen_random_uuid\(\)"\)\)/g, '@default(uuid())')
  // volume_info Json? → suportado em SQLite via Prisma (String interna) — Json é suportado no SQLite pelo Prisma 6
  ;

fs.writeFileSync(path.join(root, 'prisma', 'schema.dev.prisma'), out);
console.log('OK: prisma/schema.dev.prisma gerado (sqlite)');
