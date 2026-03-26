import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "neatique-admin-session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 12;

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

export function validateAdminCredentials(username: string, password: string) {
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "change-this-password";
  return username === adminUsername && password === adminPassword;
}

export function createAdminToken(username: string) {
  const payload = base64UrlEncode(
    JSON.stringify({
      username,
      exp: Date.now() + SESSION_DURATION_MS
    })
  );
  const signature = getSignature(payload);
  return `${payload}.${signature}`;
}

export function verifyAdminToken(token: string) {
  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return false;
  }

  const expected = getSignature(payload);

  if (signature.length !== expected.length) {
    return false;
  }

  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return false;
  }

  const decoded = JSON.parse(base64UrlDecode(payload)) as {
    username: string;
    exp: number;
  };

  return decoded.exp > Date.now();
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token ? verifyAdminToken(token) : false;
}

export async function requireAdminSession() {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    redirect("/admin/login");
  }
}

export async function setAdminSession(username: string) {
  const cookieStore = await cookies();

  cookieStore.set({
    name: COOKIE_NAME,
    value: createAdminToken(username),
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
