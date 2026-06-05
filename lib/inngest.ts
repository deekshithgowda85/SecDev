import { Inngest, EventSchemas } from "inngest";

type Events = {
  "ci/workflow.triggered": {
    data: {
      ref: string;
      sha: string;
    };
  };
  "log/index.requested": { data: { sandboxId: string; userId: string; ttlDays: number } };
  "log/index.cron": { data: Record<string, never> };
  "security-agent/scan.run": { data: { runId: string; sandboxId: string } };
  "test/api.run": { data: { runId: string; sandboxId: string } };
  "test/performance.run": { data: { runId: string; sandboxId: string } };
  "test/security.run": { data: { runId: string; sandboxId: string } };
  "test/suite.run": { data: { runId: string; sandboxId: string } };
  "test/vibetest.run": { data: { runId: string; sandboxId: string } };
};

export const inngest = new Inngest({ 
  id: "secdev-app", 
  schemas: new EventSchemas().fromRecord<Events>() 
});
