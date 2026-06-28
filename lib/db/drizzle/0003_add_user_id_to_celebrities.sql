ALTER TABLE "celebrities" ADD COLUMN IF NOT EXISTS "user_id" integer REFERENCES "users"("id") ON DELETE SET NULL;
