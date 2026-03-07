import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { runTestSuite } from "@/lib/test-functions/test-suite";
import { runSecurityScan } from "@/lib/test-functions/security-scan";
import { runApiTests } from "@/lib/test-functions/api-tests";
import { runPerformanceTests } from "@/lib/test-functions/performance-tests";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runTestSuite, runSecurityScan, runApiTests, runPerformanceTests],
});
