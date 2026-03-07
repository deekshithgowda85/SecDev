import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "secdev",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
