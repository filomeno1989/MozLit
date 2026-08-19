-- AlterTable: Add data_nascimento to profiles
ALTER TABLE "profiles" ADD COLUMN "data_nascimento" DATE;

-- AlterTable: Add faixa_etaria to books
ALTER TABLE "books" ADD COLUMN "faixa_etaria" TEXT NOT NULL DEFAULT 'Livre';

-- Remove default from senha_hash (safety)
ALTER TABLE "profiles" ALTER COLUMN "senha_hash" DROP DEFAULT;
ALTER TABLE "profiles" ALTER COLUMN "senha_hash" SET NOT NULL;

-- Create indexes
CREATE INDEX "chapters_livroId_ordem_idx" ON "chapters" ("livro_id", "ordem");
CREATE INDEX "transactions_userId_tipo_idx" ON "transactions" ("user_id", "tipo");
CREATE INDEX "library_items_userId_bookId_idx" ON "library_items" ("user_id", "book_id");
CREATE INDEX "library_items_userId_tipo_idx" ON "library_items" ("user_id", "tipo");

-- Create avatars bucket if not exists (for future use)
INSERT INTO "storage.buckets" (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 1048576, '{image/jpeg,image/png,image/webp}')
ON CONFLICT (id) DO NOTHING;