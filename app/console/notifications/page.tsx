"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell, CheckCircle, XCircle, AlertTriangle, Info, CheckCheck, RefreshCw,
} from "lucide-react";

type NotifType = "test_complete" | "test_failed" | "critical" | "vulnerability" | "info";

interface Notification {
  id: number;
  type: NotifType;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: number;
}

function NotifIcon({ type }: { type: NotifType }) {
  if (type === "test_complete") return <CheckCircle className="w-5 h-5 text-green-500" />;
  if (type === "test_failed") return <XCircle className="w-5 h-5 text-red-500" />;
  if (type === "critical") return <AlertTriangle className="w-5 h-5 text-red-600" />;
  if (type === "vulnerability") return <AlertTriangle className="w-5 h-5 text-orange-500" />;
  return <Info className="w-5 h-5 text-blue-500" />;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function groupByDate(items: Notification[]): { label: string; items: Notification[] }[] {
  const today = new Date().setHours(0, 0, 0, 0);
  const yesterday = today - 86_400_000;
  const groups: { label: string; items: Notification[] }[] = [];

  const todayItems = items.filter((n) => n.created_at >= today);
  const yesterdayItems = items.filter((n) => n.created_at >= yesterday && n.created_at < today);
  const olderItems = items.filter((n) => n.created_at < yesterday);

  if (todayItems.length > 0) groups.push({ label: "Today", items: todayItems });
  if (yesterdayItems.length > 0) groups.push({ label: "Yesterday", items: yesterdayItems });
  if (olderItems.length > 0) groups.push({ label: "Earlier", items: olderItems });

  return groups;
}

function NotifCard({
  notif,
  onRead,
}: {
  notif: Notification;
  onRead: (id: number) => void;
}) {
  const inner = (
    <div
      onClick={() => !notif.is_read && onRead(notif.id)}
      className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer group ${
        notif.is_read
          ? "border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-gray-50 dark:hover:bg-zinc-800/50"
          : "border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
      }`}
    >
      <div className="shrink-0 mt-0.5">
        <NotifIcon type={notif.type} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p
            className={`text-sm font-medium truncate ${
              notif.is_read
                ? "text-gray-700 dark:text-zinc-300"
                : "text-gray-900 dark:text-white"
            }`}
          >
            {notif.title}
          </p>
          <span className="text-[11px] text-gray-400 dark:text-zinc-500 shrink-0 tabular-nums">
            {timeAgo(notif.created_at)}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
          {notif.message}
        </p>
      </div>
      {!notif.is_read && (
        <span className="shrink-0 w-2 h-2 rounded-full bg-indigo-500 mt-1.5" />
      )}
    </div>
  );

  if (notif.link) {
    return (
      <Link href={notif.link} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d.ok) setNotifications(d.notifications ?? []); })
      .catch(() => null)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.ok) setNotifications(data.notifications ?? []);
    } catch { /* ignore */ }
    setRefreshing(false);
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const markRead = async (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const groups = groupByDate(notifications);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Notifications</h1>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-semibold">
              {unreadCount} unread
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refresh()}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors border border-gray-200 dark:border-zinc-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors border border-gray-200 dark:border-zinc-700"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[72px] rounded-xl bg-gray-100 dark:bg-zinc-800 animate-pulse"
            />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
            <Bell className="w-8 h-8 text-gray-400 dark:text-zinc-600" />
          </div>
          <div>
            <p className="text-gray-600 dark:text-zinc-300 font-medium">No notifications yet</p>
            <p className="text-gray-400 dark:text-zinc-500 text-sm mt-1">
              Run a test to start receiving notifications.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label}>
              <h2 className="text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2 px-1">
                {group.label}
              </h2>
              <div className="space-y-2">
                {group.items.map((notif) => (
                  <NotifCard key={notif.id} notif={notif} onRead={markRead} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
