import { NotImplemented } from "@/components/console/not-implemented";

export default function Page() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Deployments</h1>
      </div>
      <NotImplemented
        title="Deployments"
        description="Deployment history and live status will appear here once connected to a real CI/CD backend."
        cta={{ label: "Connect a Repository", href: "/console/github" }}
      />
    </div>
  );
}
