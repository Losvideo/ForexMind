"use server";

import { redirect } from "next/navigation";
import { createSession, deleteSession } from "@/lib/session";

export type LoginState = { error?: string } | undefined;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const password = formData.get("password");
  const sitePassword = process.env.SITE_PASSWORD;

  if (!sitePassword) {
    return { error: "SITE_PASSWORD is not configured on the server. See .env.local.example." };
  }

  if (typeof password !== "string" || password !== sitePassword) {
    return { error: "Incorrect password." };
  }

  await createSession();
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
