import { encrypt, decrypt } from "../lib/crypto";

describe("Crypto Utils", () => {
  // Mock NEXTAUTH_SECRET to ensure tests don't fail based on local env
  const OLD_ENV = process.env;

  beforeAll(() => {
    process.env = { ...OLD_ENV, NEXTAUTH_SECRET: "test-secret-key-32-chars-long-abc" };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe("Round-Trip Data Integrity", () => {
    it("should successfully encrypt and decrypt a standard string", () => {
      const plaintext = "hello world!";
      const ciphertext = encrypt(plaintext);
      const decrypted = decrypt(ciphertext);
      expect(decrypted).toBe(plaintext);
    });

    it("should handle empty strings", () => {
      const plaintext = "";
      const ciphertext = encrypt(plaintext);
      const decrypted = decrypt(ciphertext);
      expect(decrypted).toBe(plaintext);
    });

    it("should handle long strings", () => {
      const plaintext = "a".repeat(10000);
      const ciphertext = encrypt(plaintext);
      const decrypted = decrypt(ciphertext);
      expect(decrypted).toBe(plaintext);
    });

    it("should handle special characters and unicode", () => {
      const plaintext = "hello 🌍🚀 ~!@#$%^&*()_+";
      const ciphertext = encrypt(plaintext);
      const decrypted = decrypt(ciphertext);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe("Format and Delimiter Validation", () => {
    it("should return a string separated by two colons into 3 parts", () => {
      const ciphertext = encrypt("test");
      const parts = ciphertext.split(":");
      expect(parts).toHaveLength(3);
      
      const [iv, tag, enc] = parts;
      expect(iv.length).toBeGreaterThan(0);
      expect(tag.length).toBeGreaterThan(0);
      expect(enc.length).toBeGreaterThan(0);
      
      // Should be valid hex
      expect(/^[0-9a-f]+$/i.test(iv)).toBe(true);
      expect(/^[0-9a-f]+$/i.test(tag)).toBe(true);
      expect(/^[0-9a-f]+$/i.test(enc)).toBe(true);
    });
  });

  describe("Initialization Vector (IV) Uniqueness", () => {
    it("should generate a unique ciphertext for the same plaintext", () => {
      const plaintext = "identical plaintext";
      const first = encrypt(plaintext);
      const second = encrypt(plaintext);
      expect(first).not.toBe(second);
      
      const firstParts = first.split(":");
      const secondParts = second.split(":");
      // IVs should be different
      expect(firstParts[0]).not.toBe(secondParts[0]);
    });
  });

  describe("Robust Error & Tamper Handling", () => {
    it("should throw an error if the input string is malformed", () => {
      expect(() => decrypt("not-a-valid-ciphertext")).toThrow();
      expect(() => decrypt("one:two")).toThrow();
    });

    it("should throw an error if the ciphertext is modified", () => {
      const original = encrypt("top secret");
      const parts = original.split(":");
      // Tamper with the encrypted data
      parts[2] = parts[2].substring(1) + "0"; 
      const tampered = parts.join(":");
      expect(() => decrypt(tampered)).toThrow();
    });

    it("should throw an error if the authentication tag is altered", () => {
      const original = encrypt("top secret");
      const parts = original.split(":");
      // Tamper with the auth tag
      parts[1] = "00000000000000000000000000000000"; 
      const tampered = parts.join(":");
      expect(() => decrypt(tampered)).toThrow();
      describe("Secret Key Rotation Compatibility", () => {
  it("should fail to decrypt data encrypted with a different secret", () => {
    const originalSecret = process.env.NEXTAUTH_SECRET;

    process.env.NEXTAUTH_SECRET =
      "first-secret-key-32-chars-long-abc";

    const ciphertext = encrypt(
      "sensitive deployment data"
    );

    process.env.NEXTAUTH_SECRET =
      "second-secret-key-32-chars-long-xyz";

    expect(() =>
      decrypt(ciphertext)
    ).toThrow();

    process.env.NEXTAUTH_SECRET =
      originalSecret;
  });

  it("should successfully decrypt when the original secret is restored", () => {
    const originalSecret = process.env.NEXTAUTH_SECRET;

    process.env.NEXTAUTH_SECRET =
      "rotation-test-secret-1-abcdef";

    const ciphertext = encrypt(
      "persistent secret"
    );

    process.env.NEXTAUTH_SECRET =
      "rotation-test-secret-2-ghijkl";

    expect(() =>
      decrypt(ciphertext)
    ).toThrow();

    process.env.NEXTAUTH_SECRET =
      "rotation-test-secret-1-abcdef";

    const decrypted =
      decrypt(ciphertext);

    expect(decrypted).toBe(
      "persistent secret"
    );

    process.env.NEXTAUTH_SECRET =
      originalSecret;
  });

  it("should document expected behavior after key rotation", () => {
    const originalSecret = process.env.NEXTAUTH_SECRET;

    process.env.NEXTAUTH_SECRET =
      "deployment-secret-v1";

    const ciphertext =
      encrypt("rotation test");

    process.env.NEXTAUTH_SECRET =
      "deployment-secret-v2";

    expect(() =>
      decrypt(ciphertext)
    ).toThrow();

    process.env.NEXTAUTH_SECRET =
      originalSecret;
  });
});
    });
  });
});

describe("Multi-Format Data Validation", () => {
  it("should encrypt and decrypt JSON payloads correctly", () => {
    const payload = JSON.stringify({
      name: "John",
      role: "Admin",
      permissions: ["read", "write"],
    });

    const ciphertext = encrypt(payload);
    const decrypted = decrypt(ciphertext);

    expect(ciphertext).not.toBe(payload);
    expect(decrypted).toBe(payload);
  });

  it("should preserve multiline strings during encryption and decryption", () => {
    const payload = `Line 1
Line 2
Line 3
Line 4`;

    const ciphertext = encrypt(payload);
    const decrypted = decrypt(ciphertext);

    expect(ciphertext).not.toBe(payload);
    expect(decrypted).toBe(payload);
  });

  it("should correctly handle unicode and multilingual content", () => {
    const payload =
      "Hello 世界 🌍 Encryption Test 🔐 مرحبا بالعالم";

    const ciphertext = encrypt(payload);
    const decrypted = decrypt(ciphertext);

    expect(ciphertext).not.toBe(payload);
    expect(decrypted).toBe(payload);
  });

  it("should encrypt and decrypt serialized configuration data", () => {
    const payload = JSON.stringify({
      server: "localhost",
      port: 8080,
      ssl: true,
      timeout: 5000,
    });

    const ciphertext = encrypt(payload);
    const decrypted = decrypt(ciphertext);

    expect(ciphertext).not.toBe(payload);
    expect(decrypted).toBe(payload);
  });

  it("should preserve mixed unicode and serialized content", () => {
    const payload = JSON.stringify({
      username: "John",
      city: "東京",
      emoji: "🚀🔐",
      notes: "مرحبا بالعالم",
    });

    const ciphertext = encrypt(payload);
    const decrypted = decrypt(ciphertext);

    expect(ciphertext).not.toBe(payload);
    expect(decrypted).toBe(payload);
  });
});