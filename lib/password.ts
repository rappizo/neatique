import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, expectedKey] = storedHash.split(":");

  if (!salt || !expectedKey) {
    return false;
  }

  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(derivedKey), Buffer.from(expectedKey));
}

export function generateTemporaryPassword(length = 12) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  const bytes = randomBytes(length);

  return Array.from(bytes)
    .map((byte) => alphabet[byte % alphabet.length])
    .join("");
}
