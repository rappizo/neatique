const path = require("node:path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function findOrCreateCustomer(input) {
  const existing = await prisma.customer.findUnique({
    where: { email: input.email }
  });

  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        marketingOptIn: true,
        loyaltyPoints: input.loyaltyPoints
      }
    });
  }

  return prisma.customer.create({
    data: {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      marketingOptIn: true,
      loyaltyPoints: input.loyaltyPoints
    }
  });
}

async function ensureRewardEntry(input) {
  const existing = await prisma.rewardEntry.findFirst({
    where: {
      customerId: input.customerId,
      note: input.note
    },
    select: { id: true }
  });

  if (existing) {
    return existing;
  }

  return prisma.rewardEntry.create({
    data: {
      customerId: input.customerId,
      type: input.type,
      points: input.points,
      note: input.note,
      createdAt: input.createdAt
    }
  });
}

async function ensureRyoClaim(input) {
  const existing = await prisma.ryoClaim.findFirst({
    where: {
      orderId: input.orderId,
      email: input.email
    },
    select: { id: true }
  });

  if (existing) {
    return prisma.ryoClaim.update({
      where: { id: existing.id },
      data: input.data
    });
  }

  return prisma.ryoClaim.create({
    data: {
      orderId: input.orderId,
      email: input.email,
      ...input.data
    }
  });
}

async function ensureMascotRedemption(input) {
  const existing = await prisma.mascotRedemption.findFirst({
    where: {
      customerId: input.customerId,
      adminNote: input.adminNote
    },
    select: { id: true }
  });

  if (existing) {
    return prisma.mascotRedemption.update({
      where: { id: existing.id },
      data: input.data
    });
  }

  return prisma.mascotRedemption.create({
    data: {
      customerId: input.customerId,
      adminNote: input.adminNote,
      ...input.data
    }
  });
}

async function main() {
  const mascots = await prisma.mascotReward.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    take: 2
  });

  if (mascots.length < 2) {
    throw new Error("At least two active mascot rewards are required before seeding test data.");
  }

  const customerOne = await findOrCreateCustomer({
    email: "points-test-1@neatiquebeauty.com",
    firstName: "Lena",
    lastName: "Hart",
    loyaltyPoints: 1500
  });

  const customerTwo = await findOrCreateCustomer({
    email: "points-test-2@neatiquebeauty.com",
    firstName: "Mia",
    lastName: "Cole",
    loyaltyPoints: 2300
  });

  await ensureRewardEntry({
    customerId: customerOne.id,
    type: "ADJUSTMENT",
    points: 500,
    note: "TEST REWARD ENTRY 1",
    createdAt: new Date("2026-03-30T18:00:00.000Z")
  });

  await ensureRewardEntry({
    customerId: customerTwo.id,
    type: "EARNED",
    points: 500,
    note: "TEST REWARD ENTRY 2",
    createdAt: new Date("2026-03-31T02:30:00.000Z")
  });

  await ensureRyoClaim({
    orderId: "114-7777777-1234567",
    email: customerOne.email,
    data: {
      platformKey: "amazon",
      platformLabel: "Amazon",
      name: "Lena Hart",
      phone: "2135550101",
      purchasedProduct: "PDRN Cream",
      reviewRating: 5,
      commentText: "Texture feels elegant, the routine was easy to keep up with, and the finish looked polished on my vanity.",
      reviewDestinationUrl: "https://www.amazon.com/review/create-review/",
      pointsAwarded: 500,
      rewardGranted: false,
      adminNote: "TEST RYO CLAIM 1",
      completedAt: new Date("2026-03-31T01:10:00.000Z")
    }
  });

  await ensureRyoClaim({
    orderId: "512345678901234567",
    email: customerTwo.email,
    data: {
      platformKey: "tiktok",
      platformLabel: "TikTok",
      name: "Mia Cole",
      phone: "3105550172",
      purchasedProduct: "Snail Mucin Serum",
      reviewRating: 4,
      commentText: "I liked how soft and comfortable my skin felt after a week, and the texture layered well both morning and night.",
      reviewDestinationUrl: "https://www.tiktok.com/feedback/view/fe_tiktok_ecommerce_in_web/order_list/index.html",
      pointsAwarded: 500,
      rewardGranted: false,
      adminNote: "TEST RYO CLAIM 2",
      completedAt: new Date("2026-03-31T03:45:00.000Z")
    }
  });

  await ensureMascotRedemption({
    customerId: customerOne.id,
    adminNote: "TEST MASCOT REDEMPTION 1",
    data: {
      mascotId: mascots[0].id,
      pointsSpent: 1000,
      status: "REQUESTED",
      email: customerOne.email,
      fullName: "Lena Hart",
      address1: "123 Wilshire Ave",
      address2: "Apt 5B",
      city: "Santa Monica",
      state: "CA",
      postalCode: "90401",
      country: "US",
      fulfilledAt: null,
      createdAt: new Date("2026-03-31T04:15:00.000Z")
    }
  });

  await ensureMascotRedemption({
    customerId: customerTwo.id,
    adminNote: "TEST MASCOT REDEMPTION 2",
    data: {
      mascotId: mascots[1].id,
      pointsSpent: 1000,
      status: "FULFILLED",
      email: customerTwo.email,
      fullName: "Mia Cole",
      address1: "742 Maple Ridge Dr",
      address2: null,
      city: "Irvine",
      state: "CA",
      postalCode: "92618",
      country: "US",
      fulfilledAt: new Date("2026-03-31T06:00:00.000Z"),
      createdAt: new Date("2026-03-31T05:10:00.000Z")
    }
  });

  console.log("Reward points test data seeded successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
