-- DropForeignKey
ALTER TABLE "CattleRow" DROP CONSTRAINT "CattleRow_weighingSheetId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentLog" DROP CONSTRAINT "PaymentLog_weighingSheetId_fkey";

-- DropForeignKey
ALTER TABLE "PersonAccountLinkRequest" DROP CONSTRAINT "PersonAccountLinkRequest_personId_fkey";

-- DropForeignKey
ALTER TABLE "PersonAccountLinkRequest" DROP CONSTRAINT "PersonAccountLinkRequest_userId_fkey";

-- DropForeignKey
ALTER TABLE "SheetAuditLog" DROP CONSTRAINT "SheetAuditLog_weighingSheetId_fkey";

-- AlterTable
ALTER TABLE "CattleRow" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Person" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SystemSetting" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WeighingSheet" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "CattleRow" ADD CONSTRAINT "CattleRow_weighingSheetId_fkey" FOREIGN KEY ("weighingSheetId") REFERENCES "WeighingSheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonAccountLinkRequest" ADD CONSTRAINT "PersonAccountLinkRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonAccountLinkRequest" ADD CONSTRAINT "PersonAccountLinkRequest_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLog" ADD CONSTRAINT "PaymentLog_weighingSheetId_fkey" FOREIGN KEY ("weighingSheetId") REFERENCES "WeighingSheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SheetAuditLog" ADD CONSTRAINT "SheetAuditLog_weighingSheetId_fkey" FOREIGN KEY ("weighingSheetId") REFERENCES "WeighingSheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
