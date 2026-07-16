import crypto from "crypto";
import { prisma } from "./prisma";

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function validateApiToken(
  authHeader: string | null
): Promise<boolean> {
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  const hash = hashToken(token);
  const record = await prisma.apiToken.findFirst({
    where: { token_hash: hash, is_active: true },
  });
  return Boolean(record);
}

export async function getOrCreateApiToken(): Promise<{
  token: string;
  isNew: boolean;
}> {
  const existing = await prisma.apiToken.findFirst({
    where: { is_active: true },
    orderBy: { created_at: "desc" },
  });
  if (existing) {
    return { token: "", isNew: false };
  }
  const token = generateToken();
  await prisma.apiToken.create({
    data: { token_hash: hashToken(token), label: "n8n production" },
  });
  return { token, isNew: true };
}

export async function regenerateApiToken(): Promise<string> {
  await prisma.apiToken.updateMany({ data: { is_active: false } });
  const token = generateToken();
  await prisma.apiToken.create({
    data: { token_hash: hashToken(token), label: "n8n production" },
  });
  return token;
}
