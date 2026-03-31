import { prisma } from "@/lib/db";

export async function expireCouponsIfNeeded() {
  await prisma.coupon.updateMany({
    where: {
      active: true,
      expiresAt: {
        not: null,
        lte: new Date()
      }
    },
    data: {
      active: false
    }
  });
}
