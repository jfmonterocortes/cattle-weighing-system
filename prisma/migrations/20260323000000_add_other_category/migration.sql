-- Add OTHER to CattleType enum
ALTER TYPE "CattleType" ADD VALUE 'OTHER';

-- Add customSpecification column to CattleRow
ALTER TABLE "CattleRow" ADD COLUMN "customSpecification" TEXT;
