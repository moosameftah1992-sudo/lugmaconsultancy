import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "crypto";

const KEY_LENGTH = 64;
const PARAMS: ScryptOptions = { N: 16384, r: 8, p: 1 };

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, PARAMS, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

/** Returns `scrypt:<salt hex>:<hash hex>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt:${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  const [scheme, saltHex, hashHex] = (stored ?? "").split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) {
    // Burn comparable time so unknown accounts are not distinguishable by response time.
    await derive(password, Buffer.alloc(16));
    return false;
  }
  const expected = Buffer.from(hashHex, "hex");
  const actual = await derive(password, Buffer.from(saltHex, "hex"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Minimum bar for new passwords. Returns true when acceptable. */
export function isStrongEnough(password: string): boolean {
  return password.length >= 8 && password.length <= 200 && /[A-Za-z]/.test(password) && /\d/.test(password);
}
