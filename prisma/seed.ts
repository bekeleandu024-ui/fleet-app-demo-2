function startOfWeek(date: Date, weekStartsOn = 1) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = (day < weekStartsOn ? day + 7 : day) - weekStartsOn;
  result.setDate(result.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}
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
      data: { name: "Jamie Avery", type: "COM", license: "TX-8891", homeBase: "Dallas", active: true },
    }),
    prisma.driver.create({
      data: { name: "Morgan Lee", type: "OO", license: "CA-1133", homeBase: "Los Angeles", active: true },
    }),
    prisma.driver.create({
      data: { name: "Carlos Diaz", type: "COM", license: "NM-4488", homeBase: "Albuquerque", active: true },
    }),
    prisma.driver.create({
      data: { name: "Priya Patel", type: "RNR", license: "AZ-7710", homeBase: "Phoenix", active: false },
    }),
  ]);

  const units = await Promise.all([
    prisma.unit.create({
      data: {
        code: "TRK-101",
        type: "53' Dry Van",
        homeBase: "Dallas",
        active: true,
        weeklyFixedCost: new Prisma.Decimal(650),
      },
    }),
    prisma.unit.create({
      data: {
        code: "TRK-202",
        type: "Flatbed",
        homeBase: "Phoenix",
        active: true,
        weeklyFixedCost: new Prisma.Decimal(620),
      },
    }),
    prisma.unit.create({
      data: {
        code: "TRK-303",
        type: "53' Reefer",
        homeBase: "Los Angeles",
        active: true,
        weeklyFixedCost: new Prisma.Decimal(710),
      },
    }),
  ]);

  const rates = await Promise.all([
    prisma.rate.create({
      data: {
        type: "COM",
        zone: "GTA",
        fixedCPM: new Prisma.Decimal(0.48),
        wageCPM: new Prisma.Decimal(0.62),
        addOnsCPM: new Prisma.Decimal(0.1),
        rollingCPM: new Prisma.Decimal(0.07),
      },
    }),
    prisma.rate.create({
      data: {
        type: "DED",
        zone: "SOU",
        fixedCPM: new Prisma.Decimal(0.5),
        wageCPM: new Prisma.Decimal(0.6),
        addOnsCPM: new Prisma.Decimal(0.15),
        rollingCPM: new Prisma.Decimal(0.09),
      },
    }),
    prisma.rate.create({
      data: {
        type: "OTR",
        zone: "WEST",
        fixedCPM: new Prisma.Decimal(0.46),
        wageCPM: new Prisma.Decimal(0.58),
        addOnsCPM: new Prisma.Decimal(0.12),
        rollingCPM: new Prisma.Decimal(0.08),
      },
    }),
  ]);

  await prisma.rateSetting.createMany({
    data: [
      { rateKey: "BASE_WAGE", category: "DEFAULT", value: new Prisma.Decimal(0.52), unit: "$/mi", note: "Base wage per mile" },
      { rateKey: "SAFETY_PCT", category: "DEFAULT", value: new Prisma.Decimal(0.05), unit: "%", note: "Safety incentive" },
      { rateKey: "BENEFITS_PCT", category: "DEFAULT", value: new Prisma.Decimal(0.08), unit: "%", note: "Benefits allocation" },
      { rateKey: "PERF_PCT", category: "DEFAULT", value: new Prisma.Decimal(0.02), unit: "%", note: "Performance bonus" },
      { rateKey: "STEP_PCT", category: "DEFAULT", value: new Prisma.Decimal(0.03), unit: "%", note: "Tenure step increase" },
      { rateKey: "TRK_RM_CPM", category: "DEFAULT", value: new Prisma.Decimal(0.07), unit: "$/mi", note: "Truck repair & maintenance" },
      { rateKey: "TRL_RM_CPM", category: "DEFAULT", value: new Prisma.Decimal(0.05), unit: "$/mi", note: "Trailer repair & maintenance" },
      { rateKey: "FUEL_CPM", category: "COM", value: new Prisma.Decimal(0.36), unit: "$/mi", note: "Fuel surcharge for common lanes" },
      { rateKey: "FUEL_CPM", category: "DED", value: new Prisma.Decimal(0.33), unit: "$/mi", note: "Dedicated lane fuel" },
      { rateKey: "BC_PER", category: "DEFAULT", value: new Prisma.Decimal(40), unit: "$", note: "Border crossing per load" },
      { rateKey: "DH_PER", category: "DEFAULT", value: new Prisma.Decimal(1.25), unit: "$/mi", note: "Deadhead allowance" },
      { rateKey: "PICK_PER", category: "DEFAULT", value: new Prisma.Decimal(75), unit: "$", note: "Extra pick pay" },
      { rateKey: "DEL_PER", category: "DEFAULT", value: new Prisma.Decimal(65), unit: "$", note: "Extra delivery pay" },
      { rateKey: "MISC_WK", category: "DEFAULT", value: new Prisma.Decimal(400), unit: "$", note: "Miscellaneous weekly" },
      { rateKey: "SGA_WK", category: "DEFAULT", value: new Prisma.Decimal(275), unit: "$", note: "SG&A allocation" },
      { rateKey: "DTOPS_WK", category: "DEFAULT", value: new Prisma.Decimal(140), unit: "$", note: "Dispatch ops" },
      { rateKey: "ISSAC_WK", category: "DEFAULT", value: new Prisma.Decimal(80), unit: "$", note: "Isaac telematics" },
      { rateKey: "PP_WK", category: "DEFAULT", value: new Prisma.Decimal(55), unit: "$", note: "Payroll processing" },
      { rateKey: "INS_WK", category: "DEFAULT", value: new Prisma.Decimal(310), unit: "$", note: "Insurance" },
      { rateKey: "TRAILER_WK", category: "TRK-202", value: new Prisma.Decimal(95), unit: "$", note: "Trailer lease" },
      { rateKey: "TRAILER_WK", category: "TRK-303", value: new Prisma.Decimal(125), unit: "$", note: "Reefer trailer lease" },
      { rateKey: "TRUCK_WK", category: "TRK-101", value: new Prisma.Decimal(650), unit: "$", note: "Truck payment" },
      { rateKey: "TRUCK_WK", category: "TRK-202", value: new Prisma.Decimal(620), unit: "$", note: "Truck payment" },
      { rateKey: "TRUCK_WK", category: "TRK-303", value: new Prisma.Decimal(710), unit: "$", note: "Truck payment" },
    ],
  });

  const now = new Date();
  const pickup = addDays(now, -3);
  const delivery = addDays(now, -1);
  const weekStart = startOfWeek(now, 1);

  const order = await prisma.order.create({
    data: {
      customer: "Acme Foods",
      origin: "Dallas, TX",
      destination: "Albuquerque, NM",
      puWindowStart: pickup,
      puWindowEnd: addDays(pickup, 0),
      delWindowStart: delivery,
      delWindowEnd: addDays(delivery, 0),
      requiredTruck: "53' Reefer",
      notes: "Handle with care and maintain 34°F.",
    },
  });

  const miles = new Prisma.Decimal(720);
  const revenue = new Prisma.Decimal(2450);
  const fixedCPM = rates[0].fixedCPM;
  const wageCPM = rates[0].wageCPM;
  const addOnsCPM = rates[0].addOnsCPM;
  const rollingCPM = rates[0].rollingCPM;
  const totalCPM = fixedCPM.add(wageCPM).add(addOnsCPM).add(rollingCPM);
  const totalCost = totalCPM.mul(miles);
  const profit = revenue.sub(totalCost);
  const marginPct = profit.div(revenue);

  await prisma.trip.create({
    data: {
      orderId: order.id,
      driver: drivers[0].name,
      unit: units[2].code,
      driverId: drivers[0].id,
      unitId: units[2].id,
      rateId: rates[0].id,
      miles,
      revenue,
      tripStart: pickup,
      tripEnd: delivery,
      weekStart,
      status: "Completed",
      type: rates[0].type,
      zone: rates[0].zone,
      fixedCPM,
      wageCPM,
      addOnsCPM,
      rollingCPM,
      totalCPM,
      totalCost,
      profit,
      marginPct,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
