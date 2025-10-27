import { addDays } from "date-fns";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.event.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.order.deleteMany();
  await prisma.rateSetting.deleteMany();
  await prisma.rate.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.unit.deleteMany();

  const drivers = await Promise.all([
    prisma.driver.create({
      data: { name: "Jamie Avery", license: "TX-8891", homeBase: "Dallas" },
    }),
    prisma.driver.create({
      data: { name: "Morgan Lee", license: "CA-1133", homeBase: "Los Angeles" },
    }),
    prisma.driver.create({
      data: { name: "Carlos Diaz", license: "NM-4488", homeBase: "Albuquerque" },
    }),
  ]);

  const units = await Promise.all([
    prisma.unit.create({
      data: { code: "TRK-101", type: "53' Dry Van", homeBase: "Dallas" },
    }),
    prisma.unit.create({
      data: { code: "TRK-202", type: "Flatbed", homeBase: "Phoenix" },
    }),
  ]);

  const rates = await Promise.all([
    prisma.rate.create({
      data: {
        type: "Linehaul",
        zone: "TX-NM",
        fixedCPM: new Prisma.Decimal(0.45),
        wageCPM: new Prisma.Decimal(0.6),
        addOnsCPM: new Prisma.Decimal(0.12),
        rollingCPM: new Prisma.Decimal(0.08),
      },
    }),
    prisma.rate.create({
      data: {
        type: "Dedicated",
        zone: "CA-AZ",
        fixedCPM: new Prisma.Decimal(0.5),
        wageCPM: new Prisma.Decimal(0.58),
        addOnsCPM: new Prisma.Decimal(0.15),
        rollingCPM: new Prisma.Decimal(0.1),
      },
    }),
  ]);

  await prisma.rateSetting.createMany({
    data: [
      {
        rateKey: "fuel-surcharge",
        category: "linehaul",
        value: new Prisma.Decimal(0.12),
        unit: "$/mi",
        note: "Indexed weekly",
      },
      {
        rateKey: "insurance",
        category: "linehaul",
        value: new Prisma.Decimal(0.05),
        unit: "$/mi",
        note: "Cargo insurance reserve",
      },
      {
        rateKey: "safety-bonus",
        category: "dedicated",
        value: new Prisma.Decimal(0.03),
        unit: "$/mi",
        note: "Applies to dedicated lanes",
      },
    ],
  });

  const now = new Date();
  const order = await prisma.order.create({
    data: {
      customer: "Acme Foods",
      origin: "Dallas, TX",
      destination: "Albuquerque, NM",
      puWindowStart: addDays(now, -2),
      puWindowEnd: addDays(now, -2),
      delWindowStart: addDays(now, 1),
      delWindowEnd: addDays(now, 1),
      requiredTruck: "53' Reefer",
      notes: "Handle with care",
    },
  });

  await prisma.trip.create({
    data: {
      orderId: order.id,
      driver: drivers[0].name,
      unit: units[0].code,
      driverId: drivers[0].id,
      unitId: units[0].id,
      rateId: rates[0].id,
      miles: new Prisma.Decimal(650),
      revenue: new Prisma.Decimal(2100),
      tripStart: addDays(now, -2),
      tripEnd: addDays(now, -1),
      weekStart: addDays(now, -3),
      status: "Completed",
      fixedCPM: rates[0].fixedCPM,
      wageCPM: rates[0].wageCPM,
      addOnsCPM: rates[0].addOnsCPM,
      rollingCPM: rates[0].rollingCPM,
      totalCPM: new Prisma.Decimal(1.25),
      totalCost: new Prisma.Decimal(812.5),
      profit: new Prisma.Decimal(1287.5),
      marginPct: new Prisma.Decimal(61.31),
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
