-- Rename nome to pagador to preserve existing data
ALTER TABLE "Upload" RENAME COLUMN "nome" TO "pagador";

-- Add recebedor column
ALTER TABLE "Upload" ADD COLUMN "recebedor" TEXT;
