DO $$ BEGIN CREATE TYPE "UploadReviewStatus" AS ENUM ('PENDING','REVIEWED','ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "UploadMatchStatus" AS ENUM ('NONE','SUGGESTED','CONFIRMED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "StockMovementType" AS ENUM ('SALE','ADJUSTMENT','RETURN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Upload" ADD COLUMN IF NOT EXISTS "matchStatus" "UploadMatchStatus" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Upload" ADD COLUMN IF NOT EXISTS "linkedSaleId" TEXT;
ALTER TABLE "Upload" ADD COLUMN IF NOT EXISTS "linkedTransactionId" TEXT;
ALTER TABLE "Upload" ADD COLUMN IF NOT EXISTS "reviewStatus_new" "UploadReviewStatus";
UPDATE "Upload" SET "reviewStatus_new" = CASE
  WHEN "reviewStatus"::text = 'REVIEWED' THEN 'REVIEWED'::"UploadReviewStatus"
  WHEN "reviewStatus"::text = 'ARCHIVED' THEN 'ARCHIVED'::"UploadReviewStatus"
  ELSE 'PENDING'::"UploadReviewStatus"
END WHERE "reviewStatus_new" IS NULL;
ALTER TABLE "Upload" DROP COLUMN IF EXISTS "reviewStatus";
ALTER TABLE "Upload" RENAME COLUMN "reviewStatus_new" TO "reviewStatus";
ALTER TABLE "Upload" ALTER COLUMN "reviewStatus" SET NOT NULL;
ALTER TABLE "Upload" ALTER COLUMN "reviewStatus" SET DEFAULT 'PENDING';

DO $$ BEGIN ALTER TABLE "Upload" DROP COLUMN "saleId"; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Upload" DROP COLUMN "transactionId"; EXCEPTION WHEN undefined_column THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PossibleUploadMatch" (
  "id" TEXT PRIMARY KEY,
  "uploadId" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "confidenceScore" INTEGER NOT NULL,
  "ignored" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "storeId" TEXT,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "changes" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "StockMovement" (
  "id" TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "type" "StockMovementType" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "reference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PossibleUploadMatch_uploadId_idx" ON "PossibleUploadMatch"("uploadId");
CREATE INDEX IF NOT EXISTS "PossibleUploadMatch_saleId_idx" ON "PossibleUploadMatch"("saleId");
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType","entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "StockMovement_productId_idx" ON "StockMovement"("productId");
CREATE INDEX IF NOT EXISTS "StockMovement_storeId_idx" ON "StockMovement"("storeId");

DO $$ BEGIN ALTER TABLE "PossibleUploadMatch" ADD CONSTRAINT "PossibleUploadMatch_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PossibleUploadMatch" ADD CONSTRAINT "PossibleUploadMatch_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Upload" ADD CONSTRAINT "Upload_linkedSaleId_fkey" FOREIGN KEY ("linkedSaleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Upload" ADD CONSTRAINT "Upload_linkedTransactionId_fkey" FOREIGN KEY ("linkedTransactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
