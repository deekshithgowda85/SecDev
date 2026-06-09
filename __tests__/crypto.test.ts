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
    it("should throw an error when IV is empty", () => {
  expect(() =>
    decrypt(":abcdef1234567890:deadbeef")
  ).toThrow();
});

it("should throw an error when authentication tag is empty", () => {
  expect(() =>
    decrypt("abcdef1234567890::deadbeef")
  ).toThrow();
});

it("should throw an error when encrypted payload is empty", () => {
  expect(() =>
    decrypt("abcdef1234567890:abcdef1234567890:")
  ).toThrow();
});

it("should throw an error for non-hexadecimal IV values", () => {
  expect(() =>
    decrypt("invalidIV:abcdef1234567890:deadbeef")
  ).toThrow();
});

it("should throw an error for non-hexadecimal authentication tags", () => {
  expect(() =>
    decrypt("abcdef1234567890:invalidTAG:deadbeef")
  ).toThrow();
});

it("should throw an error for non-hexadecimal encrypted payloads", () => {
  expect(() =>
    decrypt("abcdef1234567890:abcdef1234567890:invalidDATA")
  ).toThrow();
});

it("should throw an error when ciphertext contains excess delimiters", () => {
  expect(() =>
    decrypt("a:b:c:d")
  ).toThrow();
});
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
    });
  });
});
