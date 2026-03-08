/**
 * POST /api/email/scan-complete
 * Send a "scan completed" notification email.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleScanComplete } from "@/lib/email/mail-controller";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const result = await handleScanComplete(body);
    return NextResponse.json(
      { ok: result.ok, messageId: result.messageId, error: result.error },
      { status: result.status },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
