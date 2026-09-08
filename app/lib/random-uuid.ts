type CryptoUuidSource = Pick<Crypto, "getRandomValues"> & Partial<Pick<Crypto, "randomUUID">>;

/**
 * Creates a UUID v4 in browsers that have Web Crypto but not crypto.randomUUID().
 * Older mobile WebViews commonly support getRandomValues() without the helper.
 */
export function createUuid(source: CryptoUuidSource = globalThis.crypto): string {
  if (typeof source?.randomUUID === "function") return source.randomUUID();
  if (typeof source?.getRandomValues !== "function") {
    throw new Error("Secure random number generation is unavailable in this browser.");
  }

  const bytes = source.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));

  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}
