import { NextResponse } from "next/server";
import { Sandbox } from "e2b";
import { getAllDeployments, killSandbox, getDeployment } from "@/lib/deployer";
import { auth } from "@/lib/auth";

/**
 * GET /api/sandboxes
 * Lists only the sandboxes that belong to the authenticated user.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const apiKey = process.env.E2B_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "E2B_API_KEY not set" }, { status: 500 });
    }

    // Pull user's deployment records from DB
    const localDeployments = await getAllDeployments(userId);
    const localByid = new Map(localDeployments.map((d) => [d.sandboxId, d]));
    // Only sandbox IDs owned by this user
    const ownedIds = new Set(localDeployments.map((d) => d.sandboxId));

    // Pull live sandbox list from E2B API (team-wide)
    const paginator = Sandbox.list({ apiKey });
    const rawSandboxes: Array<{
      sandboxId: string;
      templateId: string;
      name?: string;
      metadata: Record<string, string>;
      startedAt: Date;
    }> = [];

    while (paginator.hasNext) {
      const page = await paginator.nextItems();
      for (const sb of page) {
        // Only include sandboxes the user owns (in their DB records)
        if (ownedIds.has(sb.sandboxId)) {
          rawSandboxes.push({
            sandboxId: sb.sandboxId,
            templateId: sb.templateId,
            name: sb.name,
            metadata: sb.metadata ?? {},
            startedAt: sb.startedAt,
          });
        }
      }
    }

    // Also include DB records for sandboxes that may have already stopped (not in E2B list)
    const liveSandboxIds = new Set(rawSandboxes.map((s) => s.sandboxId));
    const stoppedDbRecords = localDeployments.filter((d) => !liveSandboxIds.has(d.sandboxId));

    const sandboxes = [
      ...rawSandboxes.map((sb) => {
        const local = localByid.get(sb.sandboxId);
        return {
          sandboxId: sb.sandboxId,
          templateId: sb.templateId,
          templateName:
            sb.templateId === "qg1v6gyvxew6q52r04lp"
              ? "secdev-web-runtime"
              : sb.templateId === "base"
              ? "base"
              : sb.templateId,
          repoName: local?.repoName ?? sb.metadata?.repoName ?? null,
          repoUrl: local?.repoUrl ?? sb.metadata?.repoUrl ?? null,
          branch: local?.branch ?? sb.metadata?.branch ?? null,
          status: local?.status ?? "running",
          publicUrl: local?.publicUrl ?? null,
          logsUrl: local ? `/console/deployments/${sb.sandboxId}` : null,
          startedAt: sb.startedAt,
          metadata: sb.metadata,
          logCount: local?.logCount ?? local?.logs.length ?? 0,
          runningForMs: Date.now() - new Date(sb.startedAt).getTime(),
          live: true,
        };
      }),
      ...stoppedDbRecords.map((d) => ({
        sandboxId: d.sandboxId,
        templateId: "secdev-web-runtime",
        templateName: "secdev-web-runtime",
        repoName: d.repoName,
        repoUrl: d.repoUrl,
        branch: d.branch,
        status: d.status,
        publicUrl: d.publicUrl,
        logsUrl: `/console/deployments/${d.sandboxId}`,
        startedAt: new Date(d.startedAt),
        metadata: {},
        logCount: d.logCount ?? 0,
        runningForMs: 0,
        live: false,
      })),
    ];

    return NextResponse.json({
      ok: true,
      total: sandboxes.length,
      sandboxes,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/sandboxes   body: { sandboxId }
 * Kills a sandbox, verifying the caller owns it.
 */
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { sandboxId } = body;
    if (!sandboxId) {
      return NextResponse.json({ error: "sandboxId required" }, { status: 400 });
    }
    // Verify ownership before killing
    const record = await getDeployment(sandboxId);
    if (record && record.userId && record.userId !== session.user.id) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    await killSandbox(sandboxId);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
