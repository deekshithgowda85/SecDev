import { NotImplemented } from "@/components/console/not-implemented";

export default function Page() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Performance</h1>
      </div>
      <NotImplemented
        title="Performance"
        description="Performance metrics, load tests, and benchmarks will appear here after integration."
        cta={{ label: "Go to Dashboard", href: "/console/dashboard" }}
      />
    </div>
  );
}
