import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  __mozlitSchemaPronto?: Promise<void>
}

/**
 * AUTO-REPARAÇÃO DO ESQUEMA (ensureSchema)
 *
 * O MozLit é actualizado via git push (deploy automático na Vercel), mas a base
 * de dados Supabase nem sempre recebe a migration correspondente. Quando o
 * código novo espera colunas/tabelas que ainda não existem, tudo falha com
 * erro 500 (ex: login, registo, carteira).
 *
 * Solução: antes da primeira consulta em cada instância do servidor, aplicamos
 * o DDL das migrations de forma IDEMPOTENTE (ADD COLUMN IF NOT EXISTS,
 * CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS). Se já estiver
 * aplicado, não faz nada. Assim o utilizador nunca precisa de executar SQL
 * manualmente na Supabase.
 *
 * Cobertura:
 *   - migration 2024-08-19: data_nascimento, faixa_etaria, indexes, senha_hash
 *   - migration 2026-09-10: telefone, email opcional, recargas_solicitacoes
 */

function isPostgres(): boolean {
  const url = process.env.DATABASE_URL || ''
  return url.startsWith('postgres://') || url.startsWith('postgresql://')
}

/** DDL idempotente, uma instrução por entrada (falhas são registadas e não bloqueiam o app). */
const DDL_AUTO_REPARACAO: string[] = [
  // ===== Migration 2024-08-19 (faixa etária + data de nascimento + índices) =====
  `ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "data_nascimento" DATE`,
  `ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "faixa_etaria" TEXT NOT NULL DEFAULT 'Livre'`,
  `ALTER TABLE "profiles" ALTER COLUMN "senha_hash" DROP DEFAULT`,
  `ALTER TABLE "profiles" ALTER COLUMN "senha_hash" SET NOT NULL`,
  `CREATE INDEX IF NOT EXISTS "chapters_livroId_ordem_idx" ON "chapters" ("livro_id", "ordem")`,
  `CREATE INDEX IF NOT EXISTS "transactions_userId_tipo_idx" ON "transactions" ("user_id", "tipo")`,
  `CREATE INDEX IF NOT EXISTS "library_items_userId_bookId_idx" ON "library_items" ("user_id", "book_id")`,
  `CREATE INDEX IF NOT EXISTS "library_items_userId_tipo_idx" ON "library_items" ("user_id", "tipo")`,

  // ===== Migration 2026-09-10 (telefone + email opcional + recargas manuais) =====
  `ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "telefone" TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "profiles_telefone_key" ON "profiles" ("telefone")`,
  `ALTER TABLE "profiles" ALTER COLUMN "email" DROP NOT NULL`,
  `CREATE TABLE IF NOT EXISTS "recargas_solicitacoes" (
      "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
      "user_id"        UUID NOT NULL,
      "moedas"         INTEGER NOT NULL,
      "valor_mzn"      DOUBLE PRECISION NOT NULL,
      "metodo"         TEXT NOT NULL DEFAULT 'MPESA',
      "numero_envio"   TEXT,
      "referencia"     TEXT,
      "nota"           TEXT,
      "estado"         TEXT NOT NULL DEFAULT 'PENDENTE',
      "nota_admin"     TEXT,
      "processada_por" UUID,
      "processada_em"  TIMESTAMPTZ(6),
      "created_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
      "updated_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
      CONSTRAINT "recargas_solicitacoes_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$
  BEGIN
      IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'recargas_solicitacoes_user_id_fkey'
      ) THEN
          ALTER TABLE "recargas_solicitacoes"
              ADD CONSTRAINT "recargas_solicitacoes_user_id_fkey"
              FOREIGN KEY ("user_id") REFERENCES "profiles"("id")
              ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
  END $$`,
  `CREATE INDEX IF NOT EXISTS "recargas_solicitacoes_user_id_estado_idx"
      ON "recargas_solicitacoes" ("user_id", "estado")`,
  `CREATE INDEX IF NOT EXISTS "recargas_solicitacoes_estado_created_at_idx"
      ON "recargas_solicitacoes" ("estado", "created_at")`,
]

/**
 * BOOTSTRAP DO ADMIN — garante que a plataforma nunca fica sem administrador.
 *
 *  1. Se ADMIN_EMAIL estiver definido (variável de ambiente na Vercel), o
 *     utilizador com esse email é promovido a ADMIN (se ainda não for).
 *  2. Caso contrário, se NÃO existir nenhum ADMIN na base de dados, o
 *     utilizador mais antigo (o dono da plataforma) é promovido a ADMIN.
 *
 * A operação nunca RETIRA o papel de admin a ninguém; apenas adiciona quando
 * necessário. Corre para o caso "o admin perdeu o acesso" (ex: papel perdido
 * numa alteração manual da base de dados).
 */
async function garantirAdmin(prisma: PrismaClient): Promise<void> {
  const emailAdmin = (process.env.ADMIN_EMAIL || '').trim()
  try {
    if (emailAdmin) {
      const resultado = await prisma.$executeRaw`
        UPDATE "profiles" SET "role" = 'ADMIN', "updated_at" = now()
        WHERE LOWER("email") = ${emailAdmin.toLowerCase()} AND "role" <> 'ADMIN'`
      if (resultado > 0) {
        console.log(`[MozLit] Bootstrap: utilizador ${emailAdmin} promovido a ADMIN.`)
      }
    }

    const linhas = await prisma.$queryRaw<{ total: bigint | number }[]>`
      SELECT COUNT(*)::int AS total FROM "profiles" WHERE "role" = 'ADMIN'`
    const totalAdmins = Number(linhas[0]?.total ?? 0)

    if (totalAdmins === 0) {
      const promovidos = await prisma.$executeRaw`
        UPDATE "profiles" SET "role" = 'ADMIN', "updated_at" = now()
        WHERE "id" = (SELECT "id" FROM "profiles" ORDER BY "created_at" ASC LIMIT 1)`
      if (promovidos > 0) {
        console.log('[MozLit] Bootstrap: plataforma sem admin — utilizador mais antigo promovido a ADMIN.')
      }
    }
  } catch (err) {
    console.error(
      '[MozLit] Bootstrap de admin falhou (não bloqueia o app):',
      err instanceof Error ? err.message : err
    )
  }
}

async function aplicarAutoReparacao(prisma: PrismaClient): Promise<void> {
  if (!isPostgres()) return // dev local (SQLite) já é criado com o schema completo

  let aplicadas = 0
  for (const sql of DDL_AUTO_REPARACAO) {
    try {
      await prisma.$executeRawUnsafe(sql)
      aplicadas++
    } catch (err) {
      // Uma instrução que falha (ex: já aplicada num formato antigo) não deve
      // impedir as restantes nem derrubar a aplicação.
      console.error(
        '[MozLit] Auto-reparação: instrução falhou:',
        sql.replace(/\s+/g, ' ').slice(0, 70),
        err instanceof Error ? err.message : err
      )
    }
  }
  console.log(`[MozLit] Auto-reparação do esquema concluída (${aplicadas}/${DDL_AUTO_REPARACAO.length} instruções OK).`)

  await garantirAdmin(prisma)
}

const prisma = globalForPrisma.prisma ?? new PrismaClient({})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/** Promessa que garante o esquema aplicado antes da primeira consulta. */
function esquemaPronto(): Promise<void> {
  if (!globalForPrisma.__mozlitSchemaPronto) {
    globalForPrisma.__mozlitSchemaPronto = aplicarAutoReparacao(prisma)
    // Se falhar por rede, permite nova tentativa no pedido seguinte
    globalForPrisma.__mozlitSchemaPronto.catch(() => {
      globalForPrisma.__mozlitSchemaPronto = undefined
    })
  }
  return globalForPrisma.__mozlitSchemaPronto
}

/**
 * Cliente Prisma protegido: qualquer operação (modelos, $transaction, raw SQL)
 * espera primeiro pela auto-reparação do esquema.
 * Mantém a tipagem de PrismaClient, por isso o resto do código não muda.
 */
function proteger<T extends object>(alvo: T, pronto: () => Promise<void>): T {
  return new Proxy(alvo, {
    get(destino, prop, receptor) {
      if (typeof prop === 'symbol') return Reflect.get(destino, prop, receptor)
      const valor = Reflect.get(destino, prop, receptor)
      if (typeof valor === 'function') {
        // $transaction, $queryRaw, $executeRaw, $connect, $disconnect, etc.
        return (...args: unknown[]) => pronto().then(() => (valor as (...a: unknown[]) => unknown).apply(destino, args))
      }
      if (valor && typeof valor === 'object') {
        // Delegates de modelos: user, book, chapter, transaction, recargaSolicitacao...
        return proteger(valor as object, pronto)
      }
      return valor
    },
  }) as T
}

export const db: PrismaClient = proteger(prisma, esquemaPronto)
