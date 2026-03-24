/*
  Warnings:

  - You are about to drop the column `editableUntilByLiquidador` on the `WeighingSheet` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "WeighingSheet_editableUntilByLiquidador_idx";

-- AlterTable
ALTER TABLE "WeighingSheet" DROP COLUMN "editableUntilByLiquidador",
ADD COLUMN     "lockedByLiquidador" BOOLEAN NOT NULL DEFAULT false;
