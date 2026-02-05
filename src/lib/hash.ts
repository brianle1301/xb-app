/**
 * cyrb53 - A fast, high-quality 53-bit hash function.
 *
 * This is a non-cryptographic hash with excellent avalanche properties
 * and very low collision probability. It produces a 53-bit hash which
 * is within JavaScript's safe integer range.
 *
 * @see https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js
 */
export function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  // Return as hex string for readability
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

/**
 * Hash document content for seen-state tracking.
 * Uses cyrb53 for fast, reliable content comparison.
 */
export function hashContent(content: unknown): string {
  return cyrb53(JSON.stringify(content));
}
