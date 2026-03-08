import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get("unread") === "1";

  try {
    const sql = getDb();

    if (unreadOnly) {
      const rows = await sql`
        SELECT COUNT(*) AS count FROM notifications
        WHERE user_id = ${userId} AND is_read = false
      `;
      return NextResponse.json({ ok: true, unreadCount: Number(rows[0]?.count ?? 0) });
    }

    const notifications = await sql`
      SELECT id, type, title, message, link, metadata, is_read, created_at
      FROM notifications
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return NextResponse.json({ ok: true, notifications, unreadCount });
  } catch (err) {
    console.error("[notifications GET]", err);
    return NextResponse.json({ ok: false, error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    const sql = getDb();

    if (body.all === true) {
      await sql`UPDATE notifications SET is_read = true WHERE user_id = ${userId}`;
    } else if (Array.isArray(body.ids) && body.ids.length > 0) {
      // Coerce to numbers to prevent injection — only valid BigInt ids are accepted
      const ids = (body.ids as unknown[])
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0);
      if (ids.length > 0) {
        await sql`
          UPDATE notifications SET is_read = true
          WHERE user_id = ${userId} AND id = ANY(${ids}::bigint[])
        `;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notifications PATCH]", err);
    return NextResponse.json({ ok: false, error: "Failed to update notifications" }, { status: 500 });
  }
}
