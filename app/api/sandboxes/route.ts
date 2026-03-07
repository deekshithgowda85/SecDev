import { NextResponse } from "next/server";
import { Sandbox } from "e2b";
import { getAllDeployments, killSandbox } from "@/lib/deployer";

/**
 * GET /api/sandboxes
 * Lists every active E2B sandbox from the API, merged with any local
 * deployment records so we get status + log count even for in-progress deploys.
 */
export async function GET() {
  try {
    const apiKey = process.env.E2B_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "E2B_API_KEY not set" }, { status: 500 });
    }

    // Pull live list from E2B
    const paginator = Sandbox.list({ apiKey });
    const rawSandboxes: Array<{
      sandboxId: string;
      templateId: string;
      name?: string;
      metadata: Record<string, string>;
      startedAt: Date;
      clientId?: string;
    }> = [];

    while (paginator.hasNext) {
      const page = await paginator.nextItems();
      for (const sb of page) {
        rawSandboxes.push({
          sandboxId: sb.sandboxId,
          templateId: sb.templateId,
          name: sb.name,
          metadata: sb.metadata ?? {},
          startedAt: sb.startedAt,
        });
      }
    }

    // Merge with DB deployment records for richer data
    const localByid = new Map((await getAllDeployments()).map((d) => [d.sandboxId, d]));

    const sandboxes = rawSandboxes.map((sb) => {
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
      };
    });

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
 * Kills a specific sandbox by ID.
 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { sandboxId } = body;
    if (!sandboxId) {
      return NextResponse.json({ error: "sandboxId required" }, { status: 400 });
    }
    await killSandbox(sandboxId);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
