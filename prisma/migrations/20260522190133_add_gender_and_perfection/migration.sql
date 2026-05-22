/*
  Warnings:

  - The values [TRANSFER] on the enum `ApplicationType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- AlterEnum
BEGIN;
CREATE TYPE "ApplicationType_new" AS ENUM ('CHECK_IN', 'CHECK_OUT');
ALTER TABLE "Application" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Application" ALTER COLUMN "type" TYPE "ApplicationType_new" USING ("type"::text::"ApplicationType_new");
ALTER TYPE "ApplicationType" RENAME TO "ApplicationType_old";
ALTER TYPE "ApplicationType_new" RENAME TO "ApplicationType";
DROP TYPE "ApplicationType_old";
ALTER TABLE "Application" ALTER COLUMN "type" SET DEFAULT 'CHECK_IN';
COMMIT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gender" "Gender" NOT NULL DEFAULT 'OTHER';
