-- ============================================================
-- MozLit Migration: telefone + recargas manuais (M-Pesa)
-- Data: 2026-09-10
--
-- Aplicar na Supabase (SQL Editor) ou psql.
-- Idempotente: pode ser executada mais de uma vez sem erro.
--
-- Alterações:
--   1. profiles.telefone (opcional, único) — login/registo por número
--   2. profiles.email passa a opcional (estrangeiros / sem email)
--   3. Nova tabela recargas_solicitacoes (fluxo manual de recarga MC)
-- ============================================================

-- 1) Telefone no perfil (formato internacional: +258841234567)
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "telefone" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_telefone_key" ON "profiles" ("telefone");

-- 2) Email opcional (NULL para contas criadas só com telefone;
--    o índice único existente permite múltiplos NULL no PostgreSQL)
ALTER TABLE "profiles" ALTER COLUMN "email" DROP NOT NULL;

-- 3) Solicitações de recarga manual
CREATE TABLE IF NOT EXISTS "recargas_solicitacoes" (
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
);

-- Usuário dono da recarga (cascade: apagar usuário apaga as suas recargas)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'recargas_solicitacoes_user_id_fkey'
    ) THEN
        ALTER TABLE "recargas_solicitacoes"
            ADD CONSTRAINT "recargas_solicitacoes_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "profiles"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Índices de consulta (painel admin + histórico do usuário)
CREATE INDEX IF NOT EXISTS "recargas_solicitacoes_user_id_estado_idx"
    ON "recargas_solicitacoes" ("user_id", "estado");
CREATE INDEX IF NOT EXISTS "recargas_solicitacoes_estado_created_at_idx"
    ON "recargas_solicitacoes" ("estado", "created_at");
