import { env } from "cloudflare:workers";

export function runtimeValue(key: string): string | undefined {
  const workerValue = (env as Record<string, unknown>)[key];
  if (typeof workerValue === "string") return workerValue;
  const processValue = process.env[key];
  return typeof processValue === "string" ? processValue : undefined;
}
