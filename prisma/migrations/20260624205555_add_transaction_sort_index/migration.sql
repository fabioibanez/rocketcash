-- DropIndex
DROP INDEX "transactions_date_idx";

-- CreateIndex
CREATE INDEX "transactions_date_created_at_idx" ON "transactions"("date" DESC, "created_at" DESC);
