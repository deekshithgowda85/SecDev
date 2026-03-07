import { NextResponse } from "next/server";
import { killSandbox, getDeployment, deleteDeployment } from "@/lib/deployer";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const record = await getDeployment(id);
  if (!record) {
    return NextResponse.json({ ok: false, error: "Deployment not found" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    deployment: {
      sandboxId: record.sandboxId,
      repoName: record.repoName,
      repoUrl: record.repoUrl,
      branch: record.branch,
      publicUrl: record.publicUrl,
      status: record.status,
      startedAt: record.startedAt,
      logs: record.logs,
    },
  });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    // Kill the live sandbox (may throw if already dead — that's fine)
    await killSandbox(id).catch(() => null);
    // Remove the record + logs from the database
    await deleteDeployment(id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
