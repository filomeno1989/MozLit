-- Fase 5 2026-09-22: notificações in-app (item 24)
-- Central de notificações do MozLit: novo seguidor, nova obra/capítulo de
-- autores seguidos, comentários, respostas e resultado de recargas.
-- Sem FK para books/chapters de propósito: apagar uma obra não pode apagar o
-- histórico de notificações — a UI trata o alvo inexistente com elegância.
-- (A auto-reparação em src/lib/db.ts aplica este DDL de forma idempotente.)

CREATE TABLE IF NOT EXISTS "notificacoes" (
    "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id"     UUID NOT NULL,
    "tipo"        TEXT NOT NULL,
    "titulo"      TEXT NOT NULL,
    "corpo"       TEXT NOT NULL DEFAULT '',
    "livro_id"    UUID,
    "capitulo_id" UUID,
    "autor_id"    UUID,
    "lida"        BOOLEAN NOT NULL DEFAULT false,
    "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'notificacoes_user_id_fkey'
    ) THEN
        ALTER TABLE "notificacoes"
            ADD CONSTRAINT "notificacoes_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "profiles"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "notificacoes_userId_lida_createdAt_idx"
    ON "notificacoes" ("user_id", "lida", "created_at");

CREATE INDEX IF NOT EXISTS "notificacoes_userId_createdAt_idx"
    ON "notificacoes" ("user_id", "created_at");
