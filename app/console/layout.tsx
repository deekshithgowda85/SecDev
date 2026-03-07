import { ConsoleSidebar } from "@/components/console/sidebar";
import { ConsoleTopNav } from "@/components/console/top-navbar";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-zinc-950 overflow-hidden">
      <ConsoleSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <ConsoleTopNav />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
