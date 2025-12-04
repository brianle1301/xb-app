import type { Types } from "mongoose";

/**
 * Recursively converts Mongoose types to JSON-safe types.
 * - ObjectId -> string
 * - Date -> string (ISO format)
 * - Nested objects and arrays are processed recursively
 */
type Serialized<T> = T extends Types.ObjectId
  ? string
  : T extends Date
    ? string
    : T extends Array<infer U>
      ? Serialized<U>[]
      : T extends object
        ? { [K in keyof T]: Serialized<T[K]> }
        : T;

/**
 * Serializes Mongoose documents for RPC transport.
 * Converts ObjectIds and Dates to JSON-safe formats.
 */
export function serialize<T>(doc: T): Serialized<T> {
  return JSON.parse(JSON.stringify(doc));
}
