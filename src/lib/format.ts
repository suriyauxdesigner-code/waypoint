import type { CurrencyCode } from "@/lib/types";

const SYMBOLS: Record<CurrencyCode, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  THB: "฿",
  IDR: "Rp",
  VND: "₫",
  JPY: "¥",
};

const LOCALES: Partial<Record<CurrencyCode, string>> = { INR: "en-IN" };

export const CURRENCIES: { code: CurrencyCode; label: string }[] = [
  { code: "INR", label: "₹ Indian Rupee" },
  { code: "USD", label: "$ US Dollar" },
  { code: "EUR", label: "€ Euro" },
  { code: "GBP", label: "£ British Pound" },
  { code: "THB", label: "฿ Thai Baht" },
  { code: "IDR", label: "Rp Indonesian Rupiah" },
  { code: "VND", label: "₫ Vietnamese Dong" },
  { code: "JPY", label: "¥ Japanese Yen" },
];

export function currencySymbol(c: CurrencyCode = "INR") {
  return SYMBOLS[c] ?? c;
}

/** ₹11,840 — always whole units; signed=true prefixes + for positives. */
export function money(amount: number, currency: CurrencyCode = "INR", opts: { signed?: boolean } = {}) {
  const n = Math.round(amount);
  const abs = Math.abs(n).toLocaleString(LOCALES[currency] ?? "en-US");
  const sign = n < 0 ? "−" : opts.signed && n > 0 ? "+" : "";
  return `${sign}${currencySymbol(currency)}${abs}`;
}

export function pct(value: number, digits = 0) {
  if (!Number.isFinite(value)) return "0%";
  return `${(value * 100).toFixed(digits)}%`;
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}
