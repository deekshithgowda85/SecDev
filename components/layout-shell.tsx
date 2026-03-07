"use client";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footerdemo } from "@/components/footer";

const AUTH_ROUTES = ["/login", "/register"];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = AUTH_ROUTES.includes(pathname);

  return (
    <>
      {!isAuth && <Navbar />}
      <main>{children}</main>
      <Footerdemo />
    </>
  );
}
