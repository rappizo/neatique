import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

const COOKIE_NAME = "neatique-admin-session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 12;

export type AdminRole = "admin" | "finance";

export type AdminSession = {
  username: string;
  role: AdminRole;
  exp: number;
};

type AdminUser = {
  username: string;
  password?: string;
  passwordHash?: string;
  role: AdminRole;
  credentialFingerprint: string;
};

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hashSessionToken(token: string) {
  return hashValue(token);
}

function safeTextEqual(left: string, right: string) {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function configuredUser(input: {
  username: string;
  password?: string;
  passwordHash?: string;
  role: AdminRole;
}): AdminUser | null {
  const password = input.password?.trim() || undefined;
  const passwordHash = input.passwordHash?.trim() || undefined;

  if (!input.username.trim() || (!password && !passwordHash)) {
    return null;
  }

  return {
    username: input.username.trim(),
    password,
    passwordHash,
    role: input.role,
    credentialFingerprint: hashValue(
      `${input.username.trim()}:${input.role}:${passwordHash || password || ""}`
    )
  } satisfies AdminUser;
}

function getAdminUsers(): AdminUser[] {
  return [
    configuredUser({
      username: process.env.ADMIN_USERNAME || "admin",
      password: process.env.ADMIN_PASSWORD,
      passwordHash: process.env.ADMIN_PASSWORD_HASH,
      role: "admin"
    }),
    configuredUser({
      username: process.env.FINANCE_ALICE_USERNAME || "alice",
      password: process.env.FINANCE_ALICE_PASSWORD,
      passwordHash: process.env.FINANCE_ALICE_PASSWORD_HASH,
      role: "finance"
    }),
    configuredUser({
      username: process.env.FINANCE_AIMU_USERNAME || "aimu",
      password: process.env.FINANCE_AIMU_PASSWORD,
      passwordHash: process.env.FINANCE_AIMU_PASSWORD_HASH,
      role: "finance"
    })
  ].filter((user): user is AdminUser => Boolean(user));
}

function findAdminUser(username: string) {
  return getAdminUsers().find((user) => safeTextEqual(user.username, username.trim())) ?? null;
}

function hasValidPassword(user: AdminUser, password: string) {
  if (user.passwordHash) {
    return verifyPassword(password, user.passwordHash);
  }

  return user.password ? safeTextEqual(user.password, password) : false;
}

export function getAdminUserForCredentials(username: string, password: string) {
  const user = findAdminUser(username);
  return user && hasValidPassword(user, password) ? user : null;
}

export function validateAdminCredentials(username: string, password: string) {
  return Boolean(getAdminUserForCredentials(username, password));
}

export function validateFullAdminCredentials(username: string, password: string) {
  return getAdminUserForCredentials(username, password)?.role === "admin";
}

export function hasConfiguredAdminCredentials() {
  return getAdminUsers().length > 0;
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: hashSessionToken(token) }
  });

  if (!session || session.expiresAt <= new Date()) {
    if (session) {
      await prisma.adminSession.delete({ where: { id: session.id } }).catch(() => undefined);
    }
    return null;
  }

  const user = findAdminUser(session.username);
  if (!user || user.role !== session.role || user.credentialFingerprint !== session.credentialFingerprint) {
    await prisma.adminSession.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  return {
    username: session.username,
    role: user.role,
    exp: session.expiresAt.getTime()
  } satisfies AdminSession;
}

export async function isAdminAuthenticated() {
  return Boolean(await getAdminSession());
}

export async function isFullAdminAuthenticated() {
  return (await getAdminSession())?.role === "admin";
}

export async function requireAdminSession() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return session;
}

export async function requireFullAdminSession() {
  const session = await requireAdminSession();

  if (session.role !== "admin") {
    redirect("/admin/finance");
  }

  return session;
}

export async function setAdminSession(username: string, role: AdminRole) {
  const user = findAdminUser(username);
  if (!user || user.role !== role) {
    throw new Error("Admin credentials are not configured for this user.");
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.adminSession.create({
    data: {
      tokenHash: hashSessionToken(token),
      username: user.username,
      role: user.role,
      credentialFingerprint: user.credentialFingerprint,
      expiresAt
    }
  });

  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    await prisma.adminSession.deleteMany({
      where: { tokenHash: hashSessionToken(token) }
    });
  }

  cookieStore.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0)
  });
}
