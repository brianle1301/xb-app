import { createServerOnlyFn } from "@tanstack/react-start";
import { type Collection, type Db, MongoClient } from "mongodb";

import type {
  BoxDoc,
  ExperimentDoc,
  JournalEntryDoc,
  SubscriptionDoc,
  TaskCompletionDoc,
} from "./types";

// Singleton client instance (wrapped in server-only context)
let client: MongoClient | null = null;
let db: Db | null = null;

const connectDB = createServerOnlyFn(async (): Promise<Db> => {
  if (db) return db;

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error(
      "Please define the MONGODB_URI environment variable inside .env"
    );
  }

  client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(process.env.MONGODB_DATABASE);
  console.log("MongoDB connected successfully");
  return db;
});

export const getDB = createServerOnlyFn(async (): Promise<Db> => {
  if (!db) {
    return connectDB();
  }
  return db;
});

// Typed collection getters
export const getBoxes = createServerOnlyFn(
  async (): Promise<Collection<BoxDoc>> => {
    const database = await getDB();
    return database.collection<BoxDoc>("boxes");
  }
);

export const getExperiments = createServerOnlyFn(
  async (): Promise<Collection<ExperimentDoc>> => {
    const database = await getDB();
    return database.collection<ExperimentDoc>("experiments");
  }
);

export const getSubscriptions = createServerOnlyFn(
  async (): Promise<Collection<SubscriptionDoc>> => {
    const database = await getDB();
    return database.collection<SubscriptionDoc>("subscriptions");
  }
);

export const getJournalEntries = createServerOnlyFn(
  async (): Promise<Collection<JournalEntryDoc>> => {
    const database = await getDB();
    return database.collection<JournalEntryDoc>("journalentries");
  }
);

export const getTaskCompletions = createServerOnlyFn(
  async (): Promise<Collection<TaskCompletionDoc>> => {
    const database = await getDB();
    return database.collection<TaskCompletionDoc>("taskcompletions");
  }
);

// Create indexes (call once at startup)
export const createIndexes = createServerOnlyFn(async (): Promise<void> => {
  const subscriptions = await getSubscriptions();
  const journalEntries = await getJournalEntries();
  const taskCompletions = await getTaskCompletions();

  // Subscription: unique active subscription per user/experiment
  await subscriptions.createIndex(
    { userId: 1, experimentId: 1, status: 1 },
    {
      unique: true,
      partialFilterExpression: { status: { $in: ["offered", "started"] } },
    }
  );

  // JournalEntry: unique entry per user/subscription/task/day
  await journalEntries.createIndex(
    { userId: 1, subscriptionId: 1, taskId: 1, dayNumber: 1 },
    { unique: true }
  );

  // TaskCompletion: unique completion per user/subscription/task/day
  await taskCompletions.createIndex(
    { userId: 1, subscriptionId: 1, taskId: 1, dayNumber: 1 },
    { unique: true }
  );
});
