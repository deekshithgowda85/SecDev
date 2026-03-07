import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { runTestSuite } from "@/lib/test-functions/test-suite";
import { runSecurityScan } from "@/lib/test-functions/security-scan";
import { runApiTests } from "@/lib/test-functions/api-tests";
import { runPerformanceTests } from "@/lib/test-functions/performance-tests";
import { runVibetest } from "@/lib/test-functions/vibetest-run";

// Allow Inngest handler up to 10 minutes (playwright install + 4 agents)
export const maxDuration = 600;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runTestSuite, runSecurityScan, runApiTests, runPerformanceTests, runVibetest],
});
