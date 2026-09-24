-- AlterTable
DELETE FROM "Signal";
DELETE FROM "Presence";

ALTER TABLE "Presence" ADD COLUMN "tokenHash" TEXT NOT NULL;
ALTER TABLE "Presence" ADD COLUMN "pairedWith" TEXT;

CREATE UNIQUE INDEX "Presence_tokenHash_idx" ON "Presence"("tokenHash");
