-- AlterEnum
ALTER TYPE "SheetAuditAction" ADD VALUE 'PLANILLA_LOCKED';

-- AlterTable
ALTER TABLE "WeighingSheet" ADD COLUMN     "finalizedAt" TIMESTAMP(3);
