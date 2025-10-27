-- CreateTable
CREATE TABLE "Order" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Trip" (
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
    "revenue" DECIMAL,
    "fixedCPM" DECIMAL,
    "wageCPM" DECIMAL,
    "addOnsCPM" DECIMAL,
    "rollingCPM" DECIMAL,
    "totalCPM" DECIMAL,
    "totalCost" DECIMAL,
    "profit" DECIMAL,
    "marginPct" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'Created',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "driverId" TEXT,
    "unitId" TEXT,
    "rateId" TEXT,
    CONSTRAINT "Trip_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Trip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Trip_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Trip_rateId_fkey" FOREIGN KEY ("rateId") REFERENCES "Rate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "at" DATETIME NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Event_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "license" TEXT,
    "homeBase" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "type" TEXT,
    "homeBase" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Rate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT,
    "zone" TEXT,
    "fixedCPM" DECIMAL NOT NULL,
    "wageCPM" DECIMAL NOT NULL,
    "addOnsCPM" DECIMAL NOT NULL,
    "rollingCPM" DECIMAL NOT NULL
);

-- CreateTable
CREATE TABLE "RateSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rateKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" DECIMAL NOT NULL,
    "unit" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Driver_name_key" ON "Driver"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_code_key" ON "Unit"("code");

-- CreateIndex
CREATE INDEX "Rate_type_idx" ON "Rate"("type");

-- CreateIndex
CREATE INDEX "Rate_zone_idx" ON "Rate"("zone");

-- CreateIndex
CREATE INDEX "RateSetting_category_idx" ON "RateSetting"("category");

-- CreateIndex
CREATE UNIQUE INDEX "RateSetting_rateKey_category_key" ON "RateSetting"("rateKey", "category");
