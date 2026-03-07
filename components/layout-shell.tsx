"use client";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footerdemo } from "@/components/footer";

const EXCLUDED = ["/login", "/register"];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isExcluded = EXCLUDED.includes(pathname) || pathname.startsWith("/console");

  if (isExcluded) return <>{children}</>;

  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footerdemo />
    </>
  );
}
