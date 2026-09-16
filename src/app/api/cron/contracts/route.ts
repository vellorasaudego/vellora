import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runtimeValue } from "@/lib/runtime-config";
import { resolveStorageProvider } from "@/lib/supabase/storage-config";
import { removeStaleSupabasePendingFiles } from "@/lib/supabase/storage";

const PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function isAuthorized(request: NextRequest): boolean {
  const secret = runtimeValue("CRON_SECRET")?.trim();
  const authorization = request.headers.get("authorization") || "";
  const expected = secret ? `Bearer ${secret}` : "";
  if (!secret || authorization.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(authorization), Buffer.from(expected));
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (resolveStorageProvider(runtimeValue("VELLORA_STORAGE_PROVIDER")) !== "supabase") {
    return NextResponse.json({ ok: true, removed: 0 });
  }

  const cutoff = new Date(Date.now() - PENDING_MAX_AGE_MS);
  try {
    const result = await removeStaleSupabasePendingFiles(cutoff);
    const removed = result.removed;
    console.info("[cron/contracts] Limpeza concluída", { removed });
    return NextResponse.json({ ok: true, removed });
  } catch (error) {
    console.error("[cron/contracts] Falha na limpeza", {
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
    return NextResponse.json({ error: "Não foi possível concluir a limpeza." }, { status: 503 });
  }
}
