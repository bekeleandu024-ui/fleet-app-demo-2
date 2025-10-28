-- CreateTable
CREATE TABLE "TripEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "stopId" TEXT,
    "stopLabel" TEXT,
    "odometerMiles" REAL,
    "lat" REAL,
    "lon" REAL,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TripEvent_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TripEvent_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "TripStop" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TripEvent_tripId_at_idx" ON "TripEvent"("tripId", "at");

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN "expectedRevenue" DECIMAL;
ALTER TABLE "Trip" ADD COLUMN "fixedCost" DECIMAL;
ALTER TABLE "Trip" ADD COLUMN "variableCost" DECIMAL;
ALTER TABLE "Trip" ADD COLUMN "totalVariableCPM" DECIMAL;
ALTER TABLE "Trip" ADD COLUMN "borderCrossings" INTEGER DEFAULT 0;
ALTER TABLE "Trip" ADD COLUMN "pickups" INTEGER DEFAULT 0;
ALTER TABLE "Trip" ADD COLUMN "deliveries" INTEGER DEFAULT 0;
ALTER TABLE "Trip" ADD COLUMN "dropHooks" INTEGER DEFAULT 0;
