
import crypto from "crypto";

// Strict Runtime Environment Verification Boundaries
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard IV size for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Validates and retrieves the operational encryption key buffer.
 * Caches buffer derivations to prevent redundant allocations during high-frequency requests.
 */
let cachedKeyBuffer: Buffer | null = null;

function getKeyBuffer(): Buffer {
  if (cachedKeyBuffer) return cachedKeyBuffer;

  if (!ENCRYPTION_KEY) {
    throw new Error("CRITICAL RUNTIME ERROR: 'ENCRYPTION_KEY' environment variable is unconfigured.");
  }

  // Ensure the encryption key is exactly 32 bytes (256 bits) for aes-256-gcm
  let keySource = ENCRYPTION_KEY;
  if (keySource.length < 32) {
    keySource = keySource.padEnd(32, "0"); // Safe local fallback padding
  } else if (keySource.length > 32) {
    keySource = keySource.substring(0, 32); // Truncate safely to matching bounds
  }

  cachedKeyBuffer = Buffer.from(keySource, "utf-8");
  return cachedKeyBuffer;
}

/**
 * Encrypts a cleartext string using symmetric AES-256-GCM architecture.
 * Outputs a consolidated hex payload string containing: iv + authTag + encryptedData
 */
export function encryptSecret(cleartext: string): string {
  try {
    if (!cleartext) return "";
    
    const key = getKeyBuffer();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(cleartext, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag().toString("hex");

    // Serialization format: [IV:24 hex chars][AuthTag:32 hex chars][EncryptedData...]
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error("Cryptographic Encryption Failure:", error);
    throw new Error("Symmetric encryption routine encountered an serialization processing failure.");
  }
}

/**
 * Decrypts a consolidated AES-256-GCM hex payload back into cleartext.
 */
export function decryptSecret(encryptedPayload: string): string {
  try {
    if (!encryptedPayload || !encryptedPayload.includes(":")) return "";

    const [ivHex, authTagHex, encryptedText] = encryptedPayload.split(":");
    if (!ivHex || !authTagHex || !encryptedText) {
      throw new Error("Invalid payload packaging layout context format.");
    }

    const key = getKeyBuffer();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Cryptographic Decryption Failure:", error);
    throw new Error("Symmetric decryption routine failed — AuthTag mismatch or invalid configuration credentials.");
  }
}
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export function getKey(): Buffer {
  const raw = process.env.NEXTAUTH_SECRET ?? "default-dev-secret-32-chars-long";
  return createHash("sha256").update(raw).digest();
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, dataHex] = ciphertext.split(":");
  if (!ivHex || !tagHex || dataHex === undefined) {
    throw new Error("Invalid ciphertext format");
  }
  const key = getKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return (
    decipher.update(Buffer.from(dataHex, "hex")).toString("utf8") +
    decipher.final("utf8")
  );
}
