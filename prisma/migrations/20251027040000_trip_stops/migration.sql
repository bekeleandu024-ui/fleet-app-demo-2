-- CreateTable
CREATE TABLE "TripStop" (
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
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TripStop_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TripStop_tripId_seq_idx" ON "TripStop"("tripId", "seq");

-- RedefineTables
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "at" DATETIME NOT NULL,
    "stopId" TEXT,
    "lat" REAL,
    "lon" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Event_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Event_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "TripStop" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Event" ("id", "tripId", "type", "at", "notes", "createdAt")
SELECT "id", "tripId", "type", "at", "notes", "createdAt" FROM "Event";

DROP TABLE "Event";

ALTER TABLE "new_Event" RENAME TO "Event";

PRAGMA foreign_keys=ON;
