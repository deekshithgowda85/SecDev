import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fullName = searchParams.get("repo"); // e.g. "owner/repo"

    if (!fullName) {
      return NextResponse.json({ error: "Missing repo parameter" }, { status: 400 });
    }

    // Fetch package.json from GitHub
    const res = await fetch(`https://api.github.com/repos/${fullName}/contents/package.json`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ content: null });
      }
      throw new Error(`GitHub API returned ${res.status}`);
    }

    const data = await res.json();
    if (data.content) {
      // Content is base64 encoded
      const decoded = Buffer.from(data.content, "base64").toString("utf8");
      return NextResponse.json({ content: decoded });
    }

    return NextResponse.json({ content: null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
