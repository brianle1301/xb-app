import { createServerOnlyFn } from "@tanstack/react-start";
import { type Collection, type Db, MongoClient } from "mongodb";

import type {
  BoxDoc,
  DocumentDoc,
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

export const getJournal = createServerOnlyFn(
  async (): Promise<Collection<JournalEntryDoc>> => {
    const database = await getDB();
    return database.collection<JournalEntryDoc>("journal");
  },
);

export const getDocuments = createServerOnlyFn(
  async (): Promise<Collection<DocumentDoc>> => {
    const database = await getDB();
    return database.collection<DocumentDoc>("documents");
  },
);

// Create indexes (call once at startup)
export const createIndexes = createServerOnlyFn(async (): Promise<void> => {
  const subscriptions = await getSubscriptions();
  const journal = await getJournal();
  const documents = await getDocuments();

  // Subscription: unique active subscription per user/experiment
  await subscriptions.createIndex(
    { userId: 1, experimentId: 1, status: 1 },
    {
      unique: true,
      partialFilterExpression: { status: { $in: ["offered", "started"] } },
    },
  );

  // Journal: index for querying by user/task/day (non-unique, multiple responses allowed)
  await journal.createIndex(
    { userId: 1, subscriptionId: 1, taskId: 1, dayNumber: 1 },
  );

  // Journal: index for querying by user and date (log page)
  await journal.createIndex(
    { userId: 1, date: -1 },
  );

  // Document: unique slug
  await documents.createIndex({ slug: 1 }, { unique: true });
});
