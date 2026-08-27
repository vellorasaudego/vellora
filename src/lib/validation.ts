export type NumericFieldOptions = {
  min: number;
  max: number;
  integer?: boolean;
};

export type ParsedNumber = {
  valid: boolean;
  value: number | null;
};

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^\S+@\S+\.\S+$/.test(value);
}

export function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isValidTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function parseOptionalNumber(value: unknown, options: NumericFieldOptions): ParsedNumber {
  if (value == null || value === "") return { valid: true, value: null };

  const number = typeof value === "number" ? value : Number(String(value));
  if (!Number.isFinite(number) || number < options.min || number > options.max) {
    return { valid: false, value: null };
  }
  if (options.integer && !Number.isInteger(number)) {
    return { valid: false, value: null };
  }
  return { valid: true, value: number };
}

export function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function normalizedPhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}
