/*
  Warnings:

  - Added the required column `updatedAt` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Driver" ADD COLUMN "blockedCustomers" JSONB;
ALTER TABLE "Driver" ADD COLUMN "fastApproved" BOOLEAN DEFAULT false;
ALTER TABLE "Driver" ADD COLUMN "hoursAvailableToday" REAL;
ALTER TABLE "Driver" ADD COLUMN "milesLast7d" INTEGER;
ALTER TABLE "Driver" ADD COLUMN "notes" TEXT;
ALTER TABLE "Driver" ADD COLUMN "onTimeScore" REAL;
ALTER TABLE "Driver" ADD COLUMN "preferredCustomers" JSONB;
ALTER TABLE "Driver" ADD COLUMN "type" TEXT;

-- AlterTable
ALTER TABLE "Rate" ADD COLUMN "fuelSurcharge" DECIMAL;
ALTER TABLE "Rate" ADD COLUMN "rpm" DECIMAL;

-- CreateTable
CREATE TABLE "IntakeAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "rawText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IntakeAttachment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleKey" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customer" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "puWindowStart" DATETIME,
    "puWindowEnd" DATETIME,
    "delWindowStart" DATETIME,
    "delWindowEnd" DATETIME,
    "requiredTruck" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PendingInfo',
    "qualificationNotes" TEXT,
    "source" TEXT,
    "lastSuggestedDriverId" TEXT,
    "lastSuggestedUnitId" TEXT,
    "lastSuggestedRateId" TEXT,
    "lastSuggestedPlan" JSONB,
    "lastSuggestionReason" TEXT,
    "lastSuggestedBy" TEXT,
    "lastSuggestionAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Order" ("createdAt", "customer", "delWindowEnd", "delWindowStart", "destination", "id", "notes", "origin", "puWindowEnd", "puWindowStart", "requiredTruck") SELECT "createdAt", "customer", "delWindowEnd", "delWindowStart", "destination", "id", "notes", "origin", "puWindowEnd", "puWindowStart", "requiredTruck" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE TABLE "new_RateSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rateKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" DECIMAL NOT NULL,
    "unit" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_RateSetting" ("category", "createdAt", "id", "note", "rateKey", "unit", "updatedAt", "value") SELECT "category", "createdAt", "id", "note", "rateKey", "unit", "updatedAt", "value" FROM "RateSetting";
DROP TABLE "RateSetting";
ALTER TABLE "new_RateSetting" RENAME TO "RateSetting";
CREATE INDEX "RateSetting_category_idx" ON "RateSetting"("category");
CREATE UNIQUE INDEX "RateSetting_rateKey_category_key" ON "RateSetting"("rateKey", "category");
CREATE TABLE "new_Trip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT,
    "driver" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "tripStart" DATETIME,
    "tripEnd" DATETIME,
    "weekStart" DATETIME,
    "type" TEXT,
    "zone" TEXT,
    "miles" DECIMAL NOT NULL,
    "plannedMiles" DECIMAL,
    "actualMiles" DECIMAL,
    "revenue" DECIMAL,
    "fixedCPM" DECIMAL,
    "wageCPM" DECIMAL,
    "addOnsCPM" DECIMAL,
    "rollingCPM" DECIMAL,
    "totalCPM" DECIMAL,
    "totalCost" DECIMAL,
    "profit" DECIMAL,
    "marginPct" DECIMAL,
    "finalMarginPct" DECIMAL,
    "fuelSurcharge" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'Created',
    "etaPrediction" DATETIME,
    "delayRiskPct" DECIMAL,
    "etaBaseline" DATETIME,
    "lastCheckInAt" DATETIME,
    "nextCommitmentAt" DATETIME,
    "marketRPM" DECIMAL,
    "originLat" REAL,
    "originLon" REAL,
    "destLat" REAL,
    "destLon" REAL,
    "lastSuggestedDriverId" TEXT,
    "lastSuggestedUnitId" TEXT,
    "lastSuggestedRateId" TEXT,
    "lastSuggestedPlan" JSONB,
    "lastSuggestionReason" TEXT,
    "lastSuggestedBy" TEXT,
    "lastSuggestionAt" DATETIME,
    "customerMessageAudit" JSONB,
    "driverMessageAudit" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "driverId" TEXT,
    "unitId" TEXT,
    "rateId" TEXT,
    CONSTRAINT "Trip_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Trip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Trip_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Trip_rateId_fkey" FOREIGN KEY ("rateId") REFERENCES "Rate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Trip" ("addOnsCPM", "createdAt", "driver", "driverId", "fixedCPM", "id", "marginPct", "miles", "orderId", "profit", "rateId", "revenue", "rollingCPM", "status", "totalCPM", "totalCost", "tripEnd", "tripStart", "type", "unit", "unitId", "updatedAt", "wageCPM", "weekStart", "zone") SELECT "addOnsCPM", "createdAt", "driver", "driverId", "fixedCPM", "id", "marginPct", "miles", "orderId", "profit", "rateId", "revenue", "rollingCPM", "status", "totalCPM", "totalCost", "tripEnd", "tripStart", "type", "unit", "unitId", "updatedAt", "wageCPM", "weekStart", "zone" FROM "Trip";
DROP TABLE "Trip";
ALTER TABLE "new_Trip" RENAME TO "Trip";
CREATE TABLE "new_Unit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "type" TEXT,
    "capacity" TEXT,
    "homeBase" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isOnHold" BOOLEAN NOT NULL DEFAULT false,
    "weeklyFixedCost" DECIMAL,
    "status" TEXT DEFAULT 'Available',
    "availableFrom" DATETIME,
    "lastKnownLat" REAL,
    "lastKnownLon" REAL,
    "lastKnownAt" DATETIME,
    "lastMarginPct" DECIMAL,
    "restrictions" JSONB
);
INSERT INTO "new_Unit" ("active", "code", "homeBase", "id", "type") SELECT "active", "code", "homeBase", "id", "type" FROM "Unit";
DROP TABLE "Unit";
ALTER TABLE "new_Unit" RENAME TO "Unit";
CREATE UNIQUE INDEX "Unit_code_key" ON "Unit"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Rule_ruleKey_scope_idx" ON "Rule"("ruleKey", "scope");

-- CreateIndex
CREATE INDEX "Rule_scope_idx" ON "Rule"("scope");
