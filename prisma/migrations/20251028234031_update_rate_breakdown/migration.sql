/*
  Warnings:

  - You are about to drop the column `fuelSurcharge` on the `Rate` table. All the data in the column will be lost.
  - You are about to drop the column `rpm` on the `Rate` table. All the data in the column will be lost.
  - Added the required column `fuelCPM` to the `Rate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `trailerMaintCPM` to the `Rate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `truckMaintCPM` to the `Rate` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Driver" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "license" TEXT,
    "homeBase" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "hoursAvailableToday" REAL,
    "milesLast7d" INTEGER,
    "onTimeScore" REAL,
    "fastApproved" BOOLEAN DEFAULT false,
    "preferredCustomers" TEXT,
    "blockedCustomers" TEXT,
    "notes" TEXT
);
INSERT INTO "new_Driver" ("active", "blockedCustomers", "fastApproved", "homeBase", "hoursAvailableToday", "id", "license", "milesLast7d", "name", "notes", "onTimeScore", "preferredCustomers", "type") SELECT "active", "blockedCustomers", "fastApproved", "homeBase", "hoursAvailableToday", "id", "license", "milesLast7d", "name", "notes", "onTimeScore", "preferredCustomers", "type" FROM "Driver";
DROP TABLE "Driver";
ALTER TABLE "new_Driver" RENAME TO "Driver";
CREATE UNIQUE INDEX "Driver_name_key" ON "Driver"("name");
CREATE TABLE "new_MarketLane" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "rpm" REAL NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_MarketLane" ("createdAt", "destination", "id", "origin", "rpm", "source", "updatedAt") SELECT "createdAt", "destination", "id", "origin", "rpm", "source", "updatedAt" FROM "MarketLane";
DROP TABLE "MarketLane";
ALTER TABLE "new_MarketLane" RENAME TO "MarketLane";
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
    "lastSuggestedPlan" TEXT,
    "lastSuggestionReason" TEXT,
    "lastSuggestedBy" TEXT,
    "lastSuggestionAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Order" ("createdAt", "customer", "delWindowEnd", "delWindowStart", "destination", "id", "lastSuggestedBy", "lastSuggestedDriverId", "lastSuggestedPlan", "lastSuggestedRateId", "lastSuggestedUnitId", "lastSuggestionAt", "lastSuggestionReason", "notes", "origin", "puWindowEnd", "puWindowStart", "qualificationNotes", "requiredTruck", "source", "status", "updatedAt") SELECT "createdAt", "customer", "delWindowEnd", "delWindowStart", "destination", "id", "lastSuggestedBy", "lastSuggestedDriverId", "lastSuggestedPlan", "lastSuggestedRateId", "lastSuggestedUnitId", "lastSuggestionAt", "lastSuggestionReason", "notes", "origin", "puWindowEnd", "puWindowStart", "qualificationNotes", "requiredTruck", "source", "status", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE TABLE "new_Rate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT,
    "zone" TEXT,
    "fixedCPM" DECIMAL NOT NULL,
    "wageCPM" DECIMAL NOT NULL,
    "addOnsCPM" DECIMAL NOT NULL,
    "fuelCPM" DECIMAL NOT NULL,
    "truckMaintCPM" DECIMAL NOT NULL,
    "trailerMaintCPM" DECIMAL NOT NULL,
    "rollingCPM" DECIMAL NOT NULL
);
INSERT INTO "new_Rate" ("addOnsCPM", "fixedCPM", "id", "rollingCPM", "type", "wageCPM", "zone") SELECT "addOnsCPM", "fixedCPM", "id", "rollingCPM", "type", "wageCPM", "zone" FROM "Rate";
DROP TABLE "Rate";
ALTER TABLE "new_Rate" RENAME TO "Rate";
CREATE INDEX "Rate_type_idx" ON "Rate"("type");
CREATE INDEX "Rate_zone_idx" ON "Rate"("zone");
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
    "borderCrossings" INTEGER DEFAULT 0,
    "pickups" INTEGER DEFAULT 0,
    "deliveries" INTEGER DEFAULT 0,
    "dropHooks" INTEGER DEFAULT 0,
    "miles" DECIMAL NOT NULL,
    "plannedMiles" DECIMAL,
    "actualMiles" DECIMAL,
    "expectedRevenue" DECIMAL,
    "revenue" DECIMAL,
    "fixedCPM" DECIMAL,
    "wageCPM" DECIMAL,
    "addOnsCPM" DECIMAL,
    "rollingCPM" DECIMAL,
    "totalCPM" DECIMAL,
    "totalVariableCPM" DECIMAL,
    "variableCost" DECIMAL,
    "fixedCost" DECIMAL,
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
    "lastSuggestedPlan" TEXT,
    "lastSuggestionReason" TEXT,
    "lastSuggestedBy" TEXT,
    "lastSuggestionAt" DATETIME,
    "customerMessageAudit" TEXT,
    "driverMessageAudit" TEXT,
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
INSERT INTO "new_Trip" ("actualMiles", "addOnsCPM", "borderCrossings", "createdAt", "customerMessageAudit", "delayRiskPct", "deliveries", "destLat", "destLon", "driver", "driverId", "driverMessageAudit", "dropHooks", "etaBaseline", "etaPrediction", "expectedRevenue", "finalMarginPct", "fixedCPM", "fixedCost", "fuelSurcharge", "id", "lastCheckInAt", "lastSuggestedBy", "lastSuggestedDriverId", "lastSuggestedPlan", "lastSuggestedRateId", "lastSuggestedUnitId", "lastSuggestionAt", "lastSuggestionReason", "marginPct", "marketRPM", "miles", "nextCommitmentAt", "orderId", "originLat", "originLon", "pickups", "plannedMiles", "profit", "rateId", "revenue", "rollingCPM", "status", "totalCPM", "totalCost", "totalVariableCPM", "tripEnd", "tripStart", "type", "unit", "unitId", "updatedAt", "variableCost", "wageCPM", "weekStart", "zone") SELECT "actualMiles", "addOnsCPM", "borderCrossings", "createdAt", "customerMessageAudit", "delayRiskPct", "deliveries", "destLat", "destLon", "driver", "driverId", "driverMessageAudit", "dropHooks", "etaBaseline", "etaPrediction", "expectedRevenue", "finalMarginPct", "fixedCPM", "fixedCost", "fuelSurcharge", "id", "lastCheckInAt", "lastSuggestedBy", "lastSuggestedDriverId", "lastSuggestedPlan", "lastSuggestedRateId", "lastSuggestedUnitId", "lastSuggestionAt", "lastSuggestionReason", "marginPct", "marketRPM", "miles", "nextCommitmentAt", "orderId", "originLat", "originLon", "pickups", "plannedMiles", "profit", "rateId", "revenue", "rollingCPM", "status", "totalCPM", "totalCost", "totalVariableCPM", "tripEnd", "tripStart", "type", "unit", "unitId", "updatedAt", "variableCost", "wageCPM", "weekStart", "zone" FROM "Trip";
DROP TABLE "Trip";
ALTER TABLE "new_Trip" RENAME TO "Trip";
CREATE TABLE "new_TripStop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "stopType" TEXT NOT NULL,
    "name" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postal" TEXT,
    "scheduledAt" DATETIME,
    "lat" REAL,
    "lon" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TripStop_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TripStop" ("city", "country", "createdAt", "id", "lat", "lon", "name", "postal", "scheduledAt", "seq", "state", "stopType", "street", "tripId", "updatedAt") SELECT "city", "country", "createdAt", "id", "lat", "lon", "name", "postal", "scheduledAt", "seq", "state", "stopType", "street", "tripId", "updatedAt" FROM "TripStop";
DROP TABLE "TripStop";
ALTER TABLE "new_TripStop" RENAME TO "TripStop";
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
    "restrictions" TEXT
);
INSERT INTO "new_Unit" ("active", "availableFrom", "capacity", "code", "homeBase", "id", "isOnHold", "lastKnownAt", "lastKnownLat", "lastKnownLon", "lastMarginPct", "restrictions", "status", "type", "weeklyFixedCost") SELECT "active", "availableFrom", "capacity", "code", "homeBase", "id", "isOnHold", "lastKnownAt", "lastKnownLat", "lastKnownLon", "lastMarginPct", "restrictions", "status", "type", "weeklyFixedCost" FROM "Unit";
DROP TABLE "Unit";
ALTER TABLE "new_Unit" RENAME TO "Unit";
CREATE UNIQUE INDEX "Unit_code_key" ON "Unit"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
