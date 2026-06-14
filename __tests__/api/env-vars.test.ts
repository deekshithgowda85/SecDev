import { GET, POST, DELETE } from "../../app/api/env-vars/route";

jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/env-store", () => ({
  getEnvVars: jest.fn(),
  listEnvVars: jest.fn(),
  setEnvVar: jest.fn(),
  deleteEnvVar: jest.fn(),
}));

import { auth } from "@/lib/auth";
const mockAuth = auth as jest.Mock;

function makeRequest(method: string, url: string, body?: object): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("GET /api/env-vars", () => {
  it("returns 401 when called without a session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(makeRequest("GET", "http://localhost/api/env-vars?project=x"));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/env-vars", () => {
  it("returns 401 when called without a session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(makeRequest("POST", "http://localhost/api/env-vars", { project: "x", key: "K", value: "v" }));
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/env-vars", () => {
  it("returns 401 when called without a session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await DELETE(makeRequest("DELETE", "http://localhost/api/env-vars", { project: "x", key: "K" }));
    expect(res.status).toBe(401);
  });
});
