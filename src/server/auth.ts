import { createServerOnlyFn } from "@tanstack/react-start";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { MongoClient } from "mongodb";

// Server-only: Create MongoDB client and auth instance
const createAuth = createServerOnlyFn(() => {
  const mongoClient = new MongoClient(process.env.MONGODB_URI!);

  return betterAuth({
    database: mongodbAdapter(mongoClient.db()),
    secret: process.env.BETTER_AUTH_SECRET,
    emailAndPassword: {
      enabled: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // Update session every day
    },
    plugins: [tanstackStartCookies()], // Must be last plugin
  });
});

export const auth = createAuth();

export type Session = typeof auth.$Infer.Session;
