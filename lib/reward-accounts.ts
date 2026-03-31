import { Prisma } from "@prisma/client";
import { generateTemporaryPassword, hashPassword } from "@/lib/password";

function splitFullName(name: string | null | undefined) {
  const trimmed = (name || "").trim();

  if (!trimmed) {
    return {
      firstName: null,
      lastName: null
    };
  }

  const [firstName, ...rest] = trimmed.split(/\s+/);
  return {
    firstName: firstName || null,
    lastName: rest.join(" ") || null
  };
}

export async function ensureCustomerRewardAccountTx(
  tx: Prisma.TransactionClient,
  input: {
    email: string;
    name?: string | null;
  }
) {
  const email = input.email.trim().toLowerCase();
  const nameParts = splitFullName(input.name);
  let tempPassword: string | null = null;

  const existingCustomer = await tx.customer.findUnique({
    where: { email }
  });

  if (!existingCustomer) {
    tempPassword = generateTemporaryPassword();
    const createdCustomer = await tx.customer.create({
      data: {
        email,
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
        passwordHash: hashPassword(tempPassword),
        passwordSetAt: new Date(),
        marketingOptIn: false
      }
    });

    return {
      customer: createdCustomer,
      tempPassword
    };
  }

  const needsPassword = !existingCustomer.passwordHash;

  if (!needsPassword && existingCustomer.firstName && existingCustomer.lastName) {
    return {
      customer: existingCustomer,
      tempPassword: null
    };
  }

  if (needsPassword) {
    tempPassword = generateTemporaryPassword();
  }

  const updatedCustomer = await tx.customer.update({
    where: { id: existingCustomer.id },
    data: {
      firstName: existingCustomer.firstName || nameParts.firstName,
      lastName: existingCustomer.lastName || nameParts.lastName,
      ...(needsPassword
        ? {
            passwordHash: hashPassword(tempPassword!),
            passwordSetAt: new Date()
          }
        : {})
    }
  });

  return {
    customer: updatedCustomer,
    tempPassword
  };
}
