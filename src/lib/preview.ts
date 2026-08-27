import { runtimeValue } from "./runtime-config";

export function isSafePreview(): boolean {
  return runtimeValue("VERCEL_ENV") === "preview" || runtimeValue("VELLORA_SAFE_PREVIEW") === "true";
}
