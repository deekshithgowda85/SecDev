import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  description: string | null;
  html_url: string;
  updated_at: string;
  pushed_at: string;
  language: string | null;
  stars: number;
  forks: number;
  default_branch: string;
  clone_url: string;
}

export async function GET() {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized – sign in with GitHub" }, { status: 401 });
  }

  const res = await fetch(
    "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator",
    {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
      next: { revalidate: 60 },
    }
  );

  if (!res.ok) {
    const msg = await res.text();
    return NextResponse.json(
      { error: "GitHub API error", detail: msg },
      { status: res.status }
    );
  }

  const raw = await res.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const repos: GitHubRepo[] = raw.map((r: any) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    private: r.private,
    description: r.description ?? null,
    html_url: r.html_url,
    updated_at: r.updated_at,
    pushed_at: r.pushed_at,
    language: r.language ?? null,
    stars: r.stargazers_count,
    forks: r.forks_count,
    default_branch: r.default_branch,
    clone_url: r.clone_url,
  }));

  return NextResponse.json(repos);
}
