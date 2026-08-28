export type RuntimeBindings = Record<string, unknown>;

let requestBindings: RuntimeBindings | undefined;

function globalBindings(): RuntimeBindings {
  const value = (globalThis as typeof globalThis & {
    __VELLORA_RUNTIME_BINDINGS__?: unknown;
  }).__VELLORA_RUNTIME_BINDINGS__;
  return value && typeof value === "object" ? value as RuntimeBindings : {};
}

export function setRuntimeBindings(value: unknown): void {
  requestBindings = value && typeof value === "object" ? value as RuntimeBindings : undefined;
  (globalThis as typeof globalThis & {
    __VELLORA_RUNTIME_BINDINGS__?: RuntimeBindings;
  }).__VELLORA_RUNTIME_BINDINGS__ = requestBindings;
}

export function runtimeBinding<T>(key: string): T | undefined {
  const value = (requestBindings || globalBindings())[key];
  return value as T | undefined;
}

export function runtimeValue(key: string): string | undefined {
  const workerValue = runtimeBinding<unknown>(key);
  if (typeof workerValue === "string") return workerValue;
  const processValue = typeof process !== "undefined" ? process.env[key] : undefined;
  return typeof processValue === "string" ? processValue : undefined;
}
