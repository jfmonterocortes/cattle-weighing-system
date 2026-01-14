/*
  Warnings:

  - A unique constraint covering the columns `[nameKey]` on the table `Person` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Person_name_phone_key";

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "nameKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Person_nameKey_key" ON "Person"("nameKey");
