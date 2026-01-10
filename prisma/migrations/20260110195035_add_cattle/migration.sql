-- AlterTable
ALTER TABLE "WeighingSheet" ADD COLUMN     "averageWeight" DOUBLE PRECISION,
ADD COLUMN     "totalWeight" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Cattle" (
    "id" SERIAL NOT NULL,
    "weighingSheetId" INTEGER NOT NULL,
    "number" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sex" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "mark" TEXT,

    CONSTRAINT "Cattle_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Cattle" ADD CONSTRAINT "Cattle_weighingSheetId_fkey" FOREIGN KEY ("weighingSheetId") REFERENCES "WeighingSheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
