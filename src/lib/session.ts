import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "forexmind_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — single operator, no reason to force frequent re-logins

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Generate one with `openssl rand -base64 32` and add it to .env.local."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSession() {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const session = await new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// Pure check against a raw cookie value — used both here (Server Components/Actions,
// via the cookies() API) and in proxy.ts (via req.cookies, no next/headers dependency there).
export async function isValidSession(raw: string | undefined): Promise<boolean> {
  if (!raw) return false;
  try {
    const { payload } = await jwtVerify(raw, getSecretKey(), {
      algorithms: ["HS256"],
    });
    return payload.authenticated === true;
  } catch {
    return false;
  }
}

export async function verifySession(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidSession(cookieStore.get(SESSION_COOKIE)?.value);
}

export { SESSION_COOKIE };
