/*
  Warnings:

  - You are about to alter the column `weight` on the `Cattle` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `averageWeight` on the `WeighingSheet` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `totalWeight` on the `WeighingSheet` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - A unique constraint covering the columns `[name,phone]` on the table `Person` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[personId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Cattle" ALTER COLUMN "weight" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Person" ALTER COLUMN "cedula" DROP NOT NULL;

-- AlterTable
ALTER TABLE "WeighingSheet" ALTER COLUMN "averageWeight" SET DATA TYPE INTEGER,
ALTER COLUMN "totalWeight" SET DATA TYPE INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Person_name_phone_key" ON "Person"("name", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_personId_key" ON "User"("personId");
