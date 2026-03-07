-- Rebuild domain for production-ready feature set
DROP TABLE IF EXISTS "SheetAuditLog" CASCADE;
DROP TABLE IF EXISTS "PaymentLog" CASCADE;
DROP TABLE IF EXISTS "PersonAccountLinkRequest" CASCADE;
DROP TABLE IF EXISTS "CattleRow" CASCADE;
DROP TABLE IF EXISTS "Cattle" CASCADE;
DROP TABLE IF EXISTS "WeighingSheet" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "Person" CASCADE;
DROP TABLE IF EXISTS "SystemSetting" CASCADE;

DROP TYPE IF EXISTS "LinkRequestStatus" CASCADE;
DROP TYPE IF EXISTS "CattleType" CASCADE;
DROP TYPE IF EXISTS "CattleSex" CASCADE;
DROP TYPE IF EXISTS "SheetAuditAction" CASCADE;
DROP TYPE IF EXISTS "Role" CASCADE;

CREATE TYPE "Role" AS ENUM ('ADMIN', 'LIQUIDADOR', 'CLIENT');
CREATE TYPE "LinkRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "CattleType" AS ENUM ('VACA', 'TORO', 'BUFALO', 'NOVILLO', 'TERNERO');
CREATE TYPE "CattleSex" AS ENUM ('MACHO', 'HEMBRA');
CREATE TYPE "SheetAuditAction" AS ENUM (
  'PLANILLA_CREATED',
  'PLANILLA_UPDATED',
  'PLANILLA_DELETED',
  'ROW_ADDED',
  'ROW_UPDATED',
  'ROW_DELETED',
  'ROW_REORDERED',
  'PRICE_CHANGED',
  'PAYMENT_STATUS_CHANGED',
  'SELLER_CHANGED',
  'BUYER_CHANGED',
  'LIQUIDADOR_ALIAS_CHANGED',
  'LINK_REQUEST_APPROVED',
  'LINK_REQUEST_REJECTED'
);

CREATE TABLE "Person" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "nameKey" TEXT NOT NULL,
  "phone" TEXT,
  "phoneKey" TEXT,
  "cedula" TEXT,
  "cedulaKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "User" (
  "id" SERIAL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "personId" INTEGER,
  "liquidadorAlias" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "WeighingSheet" (
  "id" SERIAL PRIMARY KEY,
  "visibleNumber" TEXT NOT NULL,
  "sheetYear" INTEGER NOT NULL,
  "sheetSequence" INTEGER NOT NULL,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sellerId" INTEGER NOT NULL,
  "buyerId" INTEGER NOT NULL,
  "createdById" INTEGER NOT NULL,
  "liquidadorAliasSnapshot" TEXT NOT NULL,
  "pricePerHead" INTEGER NOT NULL,
  "totalValue" INTEGER NOT NULL DEFAULT 0,
  "totalWeight" INTEGER NOT NULL DEFAULT 0,
  "averageWeight" INTEGER NOT NULL DEFAULT 0,
  "totalMaleWeight" INTEGER NOT NULL DEFAULT 0,
  "averageMaleWeight" INTEGER NOT NULL DEFAULT 0,
  "totalFemaleWeight" INTEGER NOT NULL DEFAULT 0,
  "averageFemaleWeight" INTEGER NOT NULL DEFAULT 0,
  "headCount" INTEGER NOT NULL DEFAULT 0,
  "isPaid" BOOLEAN NOT NULL DEFAULT FALSE,
  "paidAt" TIMESTAMP(3),
  "paidById" INTEGER,
  "editableUntilByLiquidador" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "CattleRow" (
  "id" SERIAL PRIMARY KEY,
  "weighingSheetId" INTEGER NOT NULL,
  "rowOrder" INTEGER NOT NULL,
  "type" "CattleType" NOT NULL,
  "sex" "CattleSex" NOT NULL,
  "weight" INTEGER NOT NULL,
  "cattleNumber" TEXT NOT NULL,
  "letters" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "PersonAccountLinkRequest" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "personId" INTEGER NOT NULL,
  "status" "LinkRequestStatus" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" INTEGER
);

CREATE TABLE "PaymentLog" (
  "id" SERIAL PRIMARY KEY,
  "weighingSheetId" INTEGER NOT NULL,
  "previousStatus" BOOLEAN NOT NULL,
  "newStatus" BOOLEAN NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "changedById" INTEGER NOT NULL,
  "amount" INTEGER,
  "notes" TEXT
);

CREATE TABLE "SheetAuditLog" (
  "id" SERIAL PRIMARY KEY,
  "weighingSheetId" INTEGER NOT NULL,
  "action" "SheetAuditAction" NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorUserId" INTEGER NOT NULL,
  "metadata" JSONB
);

CREATE TABLE "SystemSetting" (
  "key" TEXT PRIMARY KEY,
  "intValue" INTEGER,
  "textValue" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Person_nameKey_key" ON "Person"("nameKey");
CREATE UNIQUE INDEX "Person_cedula_key" ON "Person"("cedula");
CREATE UNIQUE INDEX "Person_cedulaKey_key" ON "Person"("cedulaKey");
CREATE INDEX "Person_nameKey_idx" ON "Person"("nameKey");
CREATE INDEX "Person_phoneKey_idx" ON "Person"("phoneKey");

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_personId_key" ON "User"("personId");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

CREATE UNIQUE INDEX "WeighingSheet_visibleNumber_key" ON "WeighingSheet"("visibleNumber");
CREATE UNIQUE INDEX "WeighingSheet_sheetYear_sheetSequence_key" ON "WeighingSheet"("sheetYear", "sheetSequence");
CREATE INDEX "WeighingSheet_sellerId_idx" ON "WeighingSheet"("sellerId");
CREATE INDEX "WeighingSheet_buyerId_idx" ON "WeighingSheet"("buyerId");
CREATE INDEX "WeighingSheet_createdById_idx" ON "WeighingSheet"("createdById");
CREATE INDEX "WeighingSheet_date_idx" ON "WeighingSheet"("date");
CREATE INDEX "WeighingSheet_isPaid_paidAt_idx" ON "WeighingSheet"("isPaid", "paidAt");
CREATE INDEX "WeighingSheet_editableUntilByLiquidador_idx" ON "WeighingSheet"("editableUntilByLiquidador");

CREATE UNIQUE INDEX "CattleRow_weighingSheetId_rowOrder_key" ON "CattleRow"("weighingSheetId", "rowOrder");
CREATE INDEX "CattleRow_weighingSheetId_cattleNumber_idx" ON "CattleRow"("weighingSheetId", "cattleNumber");
CREATE INDEX "CattleRow_type_sex_idx" ON "CattleRow"("type", "sex");

CREATE UNIQUE INDEX "PersonAccountLinkRequest_userId_personId_status_key" ON "PersonAccountLinkRequest"("userId", "personId", "status");
CREATE INDEX "PersonAccountLinkRequest_status_requestedAt_idx" ON "PersonAccountLinkRequest"("status", "requestedAt");

CREATE INDEX "PaymentLog_weighingSheetId_changedAt_idx" ON "PaymentLog"("weighingSheetId", "changedAt");
CREATE INDEX "SheetAuditLog_weighingSheetId_changedAt_idx" ON "SheetAuditLog"("weighingSheetId", "changedAt");

ALTER TABLE "User" ADD CONSTRAINT "User_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WeighingSheet" ADD CONSTRAINT "WeighingSheet_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WeighingSheet" ADD CONSTRAINT "WeighingSheet_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WeighingSheet" ADD CONSTRAINT "WeighingSheet_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WeighingSheet" ADD CONSTRAINT "WeighingSheet_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CattleRow" ADD CONSTRAINT "CattleRow_weighingSheetId_fkey" FOREIGN KEY ("weighingSheetId") REFERENCES "WeighingSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PersonAccountLinkRequest" ADD CONSTRAINT "PersonAccountLinkRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonAccountLinkRequest" ADD CONSTRAINT "PersonAccountLinkRequest_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonAccountLinkRequest" ADD CONSTRAINT "PersonAccountLinkRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentLog" ADD CONSTRAINT "PaymentLog_weighingSheetId_fkey" FOREIGN KEY ("weighingSheetId") REFERENCES "WeighingSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentLog" ADD CONSTRAINT "PaymentLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SheetAuditLog" ADD CONSTRAINT "SheetAuditLog_weighingSheetId_fkey" FOREIGN KEY ("weighingSheetId") REFERENCES "WeighingSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SheetAuditLog" ADD CONSTRAINT "SheetAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
