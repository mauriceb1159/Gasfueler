ALTER TABLE "users"
ALTER COLUMN "role" SET DEFAULT 'end_user';

UPDATE "users"
SET "role" = 'main_admin'
WHERE "role" = 'owner';
