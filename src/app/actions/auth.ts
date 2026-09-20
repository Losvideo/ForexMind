"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSession, deleteSession } from "@/lib/session";
import { checkLockout, recordFailure, recordSuccess } from "@/lib/login-attempts";

export type LoginState = { error?: string } | undefined;

async function getClientIp() {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "local";
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const ip = await getClientIp();

  const lockout = checkLockout(ip);
  if (lockout.locked) {
    return { error: `Too many failed attempts. Try again in ${lockout.retryInMinutes} minute(s).` };
  }

  const password = formData.get("password");
  const sitePassword = process.env.SITE_PASSWORD;

  if (!sitePassword) {
    return { error: "SITE_PASSWORD is not configured on the server. See .env.local.example." };
  }

  if (typeof password !== "string" || password !== sitePassword) {
    const result = recordFailure(ip);
    if (result.locked) {
      return { error: "Too many failed attempts. Locked out for 15 minutes." };
    }
    return {
      error: `Incorrect password. ${result.attemptsRemaining} attempt(s) remaining before a temporary lockout.`,
    };
  }

  recordSuccess(ip);
  await createSession();
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
