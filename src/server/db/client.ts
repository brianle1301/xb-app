import { createServerOnlyFn } from "@tanstack/react-start";
import { type Collection, type Db, MongoClient } from "mongodb";

import type {
  BoxDoc,
  ExperimentDoc,
  JournalEntryDoc,
  SubscriptionDoc,
} from "./types";

// Singleton client instance (wrapped in server-only context)
let client: MongoClient | null = null;

export const getClient = createServerOnlyFn(async (): Promise<MongoClient> => {
  if (client) return client;

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error(
      "Please define the MONGODB_URI environment variable inside .env",
    );
  }

  client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log("MongoDB connected successfully");
  return client;
});

export const getDB = createServerOnlyFn(async (): Promise<Db> => {
  const c = await getClient();
  return c.db(process.env.MONGODB_DATABASE);
});

// Typed collection getters
export const getBoxes = createServerOnlyFn(
  async (): Promise<Collection<BoxDoc>> => {
    const database = await getDB();
    return database.collection<BoxDoc>("boxes");
  },
);

export const getExperiments = createServerOnlyFn(
  async (): Promise<Collection<ExperimentDoc>> => {
    const database = await getDB();
    return database.collection<ExperimentDoc>("experiments");
  },
);

export const getSubscriptions = createServerOnlyFn(
  async (): Promise<Collection<SubscriptionDoc>> => {
    const database = await getDB();
    return database.collection<SubscriptionDoc>("subscriptions");
  },
);

export const getJournalEntries = createServerOnlyFn(
  async (): Promise<Collection<JournalEntryDoc>> => {
    const database = await getDB();
    return database.collection<JournalEntryDoc>("journalentries");
  },
);

// Create indexes (call once at startup)
export const createIndexes = createServerOnlyFn(async (): Promise<void> => {
  const subscriptions = await getSubscriptions();
  const journalEntries = await getJournalEntries();

  // Subscription: unique active subscription per user/experiment
  await subscriptions.createIndex(
    { userId: 1, experimentId: 1, status: 1 },
    {
      unique: true,
      partialFilterExpression: { status: { $in: ["offered", "started"] } },
    },
  );

  // JournalEntry: unique entry per user/subscription/task/day
  await journalEntries.createIndex(
    { userId: 1, subscriptionId: 1, taskId: 1, dayNumber: 1 },
    { unique: true },
  );
});
