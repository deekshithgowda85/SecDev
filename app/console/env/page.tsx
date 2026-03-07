import { NotImplemented } from "@/components/console/not-implemented";

export default function Page() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Environment Variables</h1>
      </div>
      <NotImplemented
        title="Environment Variables"
        description="Manage per-project secrets and env vars once backend storage is integrated."
        cta={{ label: "View Repositories", href: "/console/github" }}
      />
    </div>
  );
}
