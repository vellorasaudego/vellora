import { NextRequest } from "next/server";
import { handlePublicLeadRequest } from "@/lib/public-lead-request";

export async function POST(req: NextRequest) {
  return handlePublicLeadRequest(req, "api/leads");
}
