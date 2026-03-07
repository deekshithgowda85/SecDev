import { NotImplemented } from "@/components/console/not-implemented";

export default function Page() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Logs</h1>
      </div>
      <NotImplemented
        title="Logs"
        description="Build and runtime logs will stream here once deployments are connected to a real backend."
        cta={{ label: "View Repositories", href: "/console/github" }}
      />
    </div>
  );
}
