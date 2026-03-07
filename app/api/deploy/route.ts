import { NextResponse } from "next/server";
import { startDeployment } from "@/lib/deployer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { repoUrl } = body;
    if (!repoUrl) return NextResponse.json({ error: "repoUrl required" }, { status: 400 });

    // Start deployment (stubbed)
    const result = await startDeployment(repoUrl);

    return NextResponse.json({ ok: true, deployment: result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
