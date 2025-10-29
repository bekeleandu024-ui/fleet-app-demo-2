-- DropIndex
DROP INDEX "MarketLane_origin_destination_idx";

-- AlterTable
ALTER TABLE "TripEvent" ADD COLUMN "notes" TEXT;
