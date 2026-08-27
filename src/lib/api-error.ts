import { NextResponse } from "next/server";

export function apiError(error: unknown, context: string, publicMessage: string) {
  console.error(`[${context}] ${publicMessage}`, {
    error: error instanceof Error ? error.message : "Erro desconhecido",
  });
  return NextResponse.json({ error: publicMessage }, { status: 503 });
}
