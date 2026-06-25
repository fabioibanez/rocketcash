-- Drop columns that were synced/stored but never read by the app.
ALTER TABLE "items" DROP COLUMN IF EXISTS "institution_id";
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "official_name";
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "plaid_type";
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "subtype";
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "available_balance";
