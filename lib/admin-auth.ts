import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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
  password: string;
  role: AdminRole;
};

function base64UrlEncode(input: string) {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function getAdminSecret() {
  return process.env.ADMIN_SESSION_SECRET || "change-me-in-env";
}

function getSignature(payload: string) {
  return createHmac("sha256", getAdminSecret()).update(payload).digest("base64url");
}

function getAdminUsers(): AdminUser[] {
  return [
    {
      username: process.env.ADMIN_USERNAME || "admin",
      password: process.env.ADMIN_PASSWORD || "change-this-password",
      role: "admin"
    },
    {
      username: "alice",
      password: process.env.FINANCE_ALICE_PASSWORD || "alice123",
      role: "finance"
    },
    {
      username: "aimu",
      password: process.env.FINANCE_AIMU_PASSWORD || "aimu123",
      role: "finance"
    }
  ];
}

function findAdminUser(username: string) {
  return getAdminUsers().find((user) => user.username === username) ?? null;
}

export function getAdminUserForCredentials(username: string, password: string) {
  const user = findAdminUser(username);
  return user && user.password === password ? user : null;
}

export function validateAdminCredentials(username: string, password: string) {
  return Boolean(getAdminUserForCredentials(username, password));
}

export function validateFullAdminCredentials(username: string, password: string) {
  return getAdminUserForCredentials(username, password)?.role === "admin";
}

export function createAdminToken(username: string, role: AdminRole = findAdminUser(username)?.role ?? "admin") {
  const payload = base64UrlEncode(
    JSON.stringify({
      username,
      role,
      exp: Date.now() + SESSION_DURATION_MS
    })
  );
  const signature = getSignature(payload);
  return `${payload}.${signature}`;
}

function readAdminToken(token: string): AdminSession | null {
  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expected = getSignature(payload);

  if (signature.length !== expected.length) {
    return null;
  }

  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  try {
    const decoded = JSON.parse(base64UrlDecode(payload)) as {
      username?: unknown;
      role?: unknown;
      exp?: unknown;
    };
    const username = typeof decoded.username === "string" ? decoded.username : "";
    const exp = typeof decoded.exp === "number" ? decoded.exp : 0;
    const role = decoded.role === "finance" || decoded.role === "admin"
      ? decoded.role
      : findAdminUser(username)?.role ?? "admin";

    if (!username || exp <= Date.now()) {
      return null;
    }

    return {
      username,
      role,
      exp
    };
  } catch {
    return null;
  }
}

export function verifyAdminToken(token: string) {
  return Boolean(readAdminToken(token));
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token ? readAdminToken(token) : null;
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

export async function setAdminSession(username: string, role: AdminRole = findAdminUser(username)?.role ?? "admin") {
  const cookieStore = await cookies();

  cookieStore.set({
    name: COOKIE_NAME,
    value: createAdminToken(username, role),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(Date.now() + SESSION_DURATION_MS)
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();

  cookieStore.set({
    name: COOKIE_NAME,
    value: "",
    path: "/",
    expires: new Date(0)
  });
}
