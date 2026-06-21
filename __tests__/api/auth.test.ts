import { POST } from "../../app/api/auth/register/route";

jest.mock("@/lib/user-auth", () => ({
  createUser: jest.fn(),
}));

import { createUser } from "@/lib/user-auth";
const mockCreateUser = createUser as jest.Mock;

function makeRequest(body: object): Request {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects a password shorter than 6 characters with 400", async () => {
    const res = await POST(makeRequest({ email: "user@example.com", password: "abc" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("rejects a duplicate email with 409", async () => {
    mockCreateUser.mockRejectedValueOnce(new Error("EMAIL_IN_USE"));
    const res = await POST(makeRequest({ email: "existing@example.com", password: "password123" }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("EMAIL_IN_USE");
  });

  it("succeeds with valid unique credentials", async () => {
    mockCreateUser.mockResolvedValueOnce("user-id-123");
    const res = await POST(makeRequest({ email: "new@example.com", password: "securepassword" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.userId).toBe("user-id-123");
  });
});
