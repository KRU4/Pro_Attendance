/** Normalize Egyptian phone numbers to +20XXXXXXXXXX format */
export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("00")) cleaned = "+" + cleaned.slice(2);
  if (cleaned.startsWith("0") && !cleaned.startsWith("+")) {
    cleaned = "+20" + cleaned.slice(1);
  }
  if (cleaned.startsWith("20") && !cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  if (!cleaned.startsWith("+")) {
    cleaned = "+20" + cleaned;
  }
  return cleaned;
}

export function isValidPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  return /^\+20\d{10}$/.test(normalized);
}
