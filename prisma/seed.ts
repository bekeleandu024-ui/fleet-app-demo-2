import { PrismaClient, Prisma } from "@prisma/client";
import { addDays, startOfWeek } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  await prisma.event.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.order.deleteMany();
  await prisma.rateSetting.deleteMany();
  await prisma.rate.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.unit.deleteMany();

  const [driverA, driverB] = await prisma.$transaction([
    prisma.driver.create({ data: { name: "Alex Johnson", homeBase: "Chicago, IL" } }),
    prisma.driver.create({ data: { name: "Maria Gomez", homeBase: "Columbus, OH" } }),
  ]);

  const [unitA, unitB] = await prisma.$transaction([
    prisma.unit.create({ data: { code: "TRK-101", type: "Sleeper", homeBase: "Chicago, IL" } }),
    prisma.unit.create({ data: { code: "TRK-202", type: "Day Cab", homeBase: "Columbus, OH" } }),
  ]);

  const [rateLinehaul, rateRegional] = await prisma.$transaction([
    prisma.rate.create({
      data: {
        type: "Linehaul",
        zone: "East",
        fixedCPM: new Prisma.Decimal(0.45),
        wageCPM: new Prisma.Decimal(0.38),
        addOnsCPM: new Prisma.Decimal(0.12),
        rollingCPM: new Prisma.Decimal(0.05),
      },
    }),
    prisma.rate.create({
      data: {
        type: "Regional",
        zone: "Central",
        fixedCPM: new Prisma.Decimal(0.40),
        wageCPM: new Prisma.Decimal(0.35),
        addOnsCPM: new Prisma.Decimal(0.10),
        rollingCPM: new Prisma.Decimal(0.04),
      },
    }),
  ]);

  await prisma.rateSetting.createMany({
    data: [
      {
        rateKey: "fuel_surcharge",
        category: "surcharge",
        value: new Prisma.Decimal(0.08),
        unit: "$/mi",
        note: "Applied when diesel > $4.00",
      },
      {
        rateKey: "deadhead_cap",
        category: "policy",
        value: new Prisma.Decimal(125),
        unit: "mi",
        note: "Deadhead overage requires approval",
      },
    ],
  });

  const order = await prisma.order.create({
    data: {
      customer: "Acme Manufacturing",
      origin: "Chicago, IL",
      destination: "Harrisburg, PA",
      puWindowStart: addDays(new Date(), 1),
      puWindowEnd: addDays(new Date(), 1),
      delWindowStart: addDays(new Date(), 2),
      delWindowEnd: addDays(new Date(), 2),
      requiredTruck: "53' Dry Van",
      notes: "Deliver before noon and call ahead",
    },
  });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  await prisma.trip.create({
    data: {
      orderId: order.id,
      driver: driverA.name,
      driverId: driverA.id,
      unit: unitA.code,
      unitId: unitA.id,
      rateId: rateLinehaul.id,
      type: "Linehaul",
      zone: "East",
      status: "Scheduled",
      weekStart,
      tripStart: addDays(weekStart, 1),
      tripEnd: addDays(weekStart, 3),
      miles: new Prisma.Decimal(980),
      revenue: new Prisma.Decimal(3100),
      fixedCPM: rateLinehaul.fixedCPM,
      wageCPM: rateLinehaul.wageCPM,
      addOnsCPM: rateLinehaul.addOnsCPM,
      rollingCPM: rateLinehaul.rollingCPM,
      totalCPM: new Prisma.Decimal(0.45 + 0.38 + 0.12 + 0.05),
      totalCost: new Prisma.Decimal(980 * (0.45 + 0.38 + 0.12 + 0.05)),
      profit: new Prisma.Decimal(3100 - 980 * (0.45 + 0.38 + 0.12 + 0.05)),
      marginPct: new Prisma.Decimal(((3100 - 980 * (0.45 + 0.38 + 0.12 + 0.05)) / 3100) * 100),
    },
  });

  await prisma.trip.create({
    data: {
      driver: driverB.name,
      driverId: driverB.id,
      unit: unitB.code,
      unitId: unitB.id,
      rateId: rateRegional.id,
      type: "Regional",
      zone: "Central",
      status: "Created",
      miles: new Prisma.Decimal(620),
      revenue: new Prisma.Decimal(1800),
      weekStart,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
