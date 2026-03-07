import { NotImplemented } from "@/components/console/not-implemented";

export default function Page() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Test Suite</h1>
      </div>
      <NotImplemented
        title="Test Suite"
        description="Automated test results and coverage reports will appear here after CI integration."
        cta={{ label: "Go to Dashboard", href: "/console/dashboard" }}
      />
    </div>
  );
}
