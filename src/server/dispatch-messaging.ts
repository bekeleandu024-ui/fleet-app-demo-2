import prisma from "@/lib/prisma";
import type { SuggestionSummary } from "./analyze-order";

export type DispatchMessage = {
  subject: string;
  body: string;
  summary: SuggestionSummary;
};

export type DispatchDraftResult = {
  customerMsg: DispatchMessage;
  driverMsg: DispatchMessage;
  summary: SuggestionSummary;
};

export async function draftDispatchMessages(orderId: string): Promise<DispatchDraftResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      trips: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  const trip = order.trips[0] ?? null;
  const customerSubject = `Dispatch confirmation – ${order.origin} → ${order.destination}`;
  const driverSubject = `Trip assignment – ${order.origin} pickup`;

  const pickupWindow = [order.puWindowStart, order.puWindowEnd]
    .filter(Boolean)
    .map((value) => new Date(value as Date).toLocaleString())
    .join(" – ");
  const deliveryWindow = [order.delWindowStart, order.delWindowEnd]
    .filter(Boolean)
    .map((value) => new Date(value as Date).toLocaleString())
    .join(" – ");

  const customerBody = [
    `Hello ${order.customer},`,
    "",
    "We have your load scheduled with the following details:",
    `• Pickup: ${order.origin}${pickupWindow ? ` (${pickupWindow})` : ""}`,
    `• Delivery: ${order.destination}${deliveryWindow ? ` (${deliveryWindow})` : ""}`,
    order.requiredTruck ? `• Equipment: ${order.requiredTruck}` : undefined,
    order.notes ? `• Notes: ${order.notes}` : undefined,
    "",
    "We'll send status updates as milestones are hit.",
    "",
    "Thanks,",
    "Dispatch",
  ]
    .filter(Boolean)
    .join("\n");

  const driverBody = [
    "Team,",
    "",
    "Please review the assignment below and confirm receipt:",
    `• Pickup: ${order.origin}${pickupWindow ? ` (${pickupWindow})` : ""}`,
    `• Delivery: ${order.destination}${deliveryWindow ? ` (${deliveryWindow})` : ""}`,
    order.requiredTruck ? `• Equipment: ${order.requiredTruck}` : undefined,
    order.notes ? `• Special Instructions: ${order.notes}` : undefined,
    "• Border docs: Bring FAST card & ACE (if applicable)",
    "",
    "Reply once loaded and provide first ETA.",
  ]
    .filter(Boolean)
    .join("\n");

  const customerSummary: SuggestionSummary = {
    textSummary: "Customer dispatch email drafted",
    why: [pickupWindow ? `Pickup window ${pickupWindow}` : "Pickup window pending"],
    actions: [
      { label: "Copy", action: "APPLY" },
      { label: "Adjust", action: "ADJUST" },
      { label: "Dismiss", action: "DISMISS" },
    ],
  };

  const driverSummary: SuggestionSummary = {
    textSummary: "Driver assignment message drafted",
    why: [deliveryWindow ? `Delivery window ${deliveryWindow}` : "Delivery window pending"],
    actions: [
      { label: "Copy", action: "APPLY" },
      { label: "Adjust", action: "ADJUST" },
      { label: "Dismiss", action: "DISMISS" },
    ],
  };

  if (trip) {
    await prisma.trip.update({
      where: { id: trip.id },
      data: {
        customerMessageAudit: { subject: customerSubject, body: customerBody, at: new Date() },
        driverMessageAudit: { subject: driverSubject, body: driverBody, at: new Date() },
        lastSuggestionReason: "Dispatch messaging drafted",
        lastSuggestedBy: "system",
        lastSuggestionAt: new Date(),
      },
    });
  }

  const summary: SuggestionSummary = {
    textSummary: "Dispatch communications prepared",
    why: ["Customer + driver drafts ready"],
    actions: [
      { label: "Copy both", action: "APPLY" },
      { label: "Adjust", action: "ADJUST" },
      { label: "Dismiss", action: "DISMISS" },
    ],
  };

  return {
    customerMsg: {
      subject: customerSubject,
      body: customerBody,
      summary: customerSummary,
    },
    driverMsg: {
      subject: driverSubject,
      body: driverBody,
      summary: driverSummary,
    },
    summary,
  };
}

export type DispatchMessagingResult = Awaited<ReturnType<typeof draftDispatchMessages>>;
