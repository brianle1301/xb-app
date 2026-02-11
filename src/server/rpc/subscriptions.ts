import { createServerFn } from "@tanstack/react-start";
import { ObjectId } from "mongodb";

import type { Task } from "@/types/shared";

import { adminMiddleware, authMiddleware } from "./auth";
import {
  type PublishedExperiment,
  serializeExperiment,
  serializeTask,
} from "./experiments";

import {
  getClient,
  getExperiments,
  getJournal,
  getSubscriptions,
} from "../db/client";
import type {
  ExperimentDoc,
  SubscriptionDoc,
  TaskCompletionEntry,
} from "../db/types";

// ============ Types ============

export type SubscriptionStatus =
  | "offered"
  | "started"
  | "completed"
  | "abandoned";

export interface TaskCompletion {
  taskId: string;
  dayNumber: number;
  firstCompletedAt: Date;
  responseCount: number;
}

export interface Subscription {
  id: string;
  userId: string;
  experimentId: string;
  status: SubscriptionStatus;
  offeredAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  completions: TaskCompletion[];
  createdAt: Date;
  updatedAt: Date;
}

// Subscription with populated experiment
export interface SubscriptionWithExperiment extends Omit<
  Subscription,
  "experimentId"
> {
  experimentId: PublishedExperiment;
  currentDay: number | null;
}

// Today tasks response
export interface TodayTasksGroup {
  subscription: Subscription;
  experiment: PublishedExperiment;
  currentDay: number;
  totalDays: number;
  tasks: Task[];
}

// ============ Serialization ============

function serializeCompletion(entry: TaskCompletionEntry): TaskCompletion {
  return {
    taskId: entry.taskId.toString(),
    dayNumber: entry.dayNumber,
    firstCompletedAt: entry.firstCompletedAt,
    responseCount: entry.responseCount,
  };
}

function serializeSubscription(doc: SubscriptionDoc): Subscription {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    experimentId: doc.experimentId.toString(),
    status: doc.status,
    offeredAt: doc.offeredAt,
    startedAt: doc.startedAt,
    endedAt: doc.endedAt,
    completions: (doc.completions || []).map(serializeCompletion),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// ============ Helpers ============

// Helper to get start of day (midnight)
function getStartOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper to calculate current day number for a subscription
function calculateCurrentDay(startedAt: Date): number {
  const now = getStartOfDay();
  const start = getStartOfDay(startedAt);
  const diffTime = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Day 1 is the first day
}

// Type for aggregation result (subscription with joined experiment)
interface SubscriptionWithExperimentDoc extends Omit<
  SubscriptionDoc,
  "experimentId"
> {
  experimentId: SubscriptionDoc["experimentId"];
  experiment: ExperimentDoc;
}

// ============ RPC Functions ============

// Get all subscriptions for a user (with experiment details) - uses aggregation to avoid N+1
export const getUserSubscriptions = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<SubscriptionWithExperiment[]> => {
    const userId = context.user.id;
    const subscriptionsCol = await getSubscriptions();

    // Use aggregation to join subscriptions with experiments in one query
    const docs = await subscriptionsCol
      .aggregate<SubscriptionWithExperimentDoc>([
        {
          $match: {
            userId,
            status: { $in: ["offered", "started"] },
          },
        },
        {
          $lookup: {
            from: "experiments",
            localField: "experimentId",
            foreignField: "_id",
            as: "experiment",
          },
        },
        { $unwind: "$experiment" },
        // Only include subscriptions for published experiments
        { $match: { "experiment.status": "published" } },
      ])
      .toArray();

    const results: SubscriptionWithExperiment[] = [];

    for (const doc of docs) {
      if (doc.status === "started" && doc.startedAt) {
        const currentDay = calculateCurrentDay(doc.startedAt);

        // Check if experiment is completed
        if (currentDay > doc.experiment.days.length) {
          // Mark as completed
          await subscriptionsCol.updateOne(
            { _id: doc._id },
            { $set: { status: "completed", endedAt: new Date() } },
          );
          continue;
        }

        results.push({
          id: doc._id.toString(),
          userId: doc.userId,
          experimentId: serializeExperiment(
            doc.experiment,
          ) as PublishedExperiment,
          status: doc.status,
          offeredAt: doc.offeredAt,
          startedAt: doc.startedAt,
          endedAt: doc.endedAt,
          completions: (doc.completions || []).map(serializeCompletion),
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          currentDay,
        });
      } else {
        results.push({
          id: doc._id.toString(),
          userId: doc.userId,
          experimentId: serializeExperiment(
            doc.experiment,
          ) as PublishedExperiment,
          status: doc.status,
          offeredAt: doc.offeredAt,
          startedAt: doc.startedAt,
          endedAt: doc.endedAt,
          completions: (doc.completions || []).map(serializeCompletion),
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          currentDay: null,
        });
      }
    }

    return results;
  });

// Start a subscription (transition from offered to started)
export const startSubscription = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: { subscriptionId: string }) => data)
  .handler(async ({ data: { subscriptionId } }): Promise<Subscription> => {
    const startedAt = getStartOfDay();
    const subscriptionsCol = await getSubscriptions();

    const result = await subscriptionsCol.findOneAndUpdate(
      { _id: new ObjectId(subscriptionId), status: "offered" },
      { $set: { status: "started", startedAt, updatedAt: new Date() } },
      { returnDocument: "after" },
    );

    if (!result) {
      throw new Error("Subscription not found or not in offered state");
    }

    return serializeSubscription(result);
  });

// Abandon a subscription
export const abandonSubscription = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: { subscriptionId: string }) => data)
  .handler(async ({ data: { subscriptionId } }): Promise<Subscription> => {
    const subscriptionsCol = await getSubscriptions();

    const result = await subscriptionsCol.findOneAndUpdate(
      { _id: new ObjectId(subscriptionId), status: "started" },
      {
        $set: {
          status: "abandoned",
          endedAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    if (!result) {
      throw new Error("Subscription not found or not in started state");
    }

    return serializeSubscription(result);
  });

// Get today's tasks based on user's active subscriptions - uses aggregation
export const getTodayTasksForUser = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<TodayTasksGroup[]> => {
    const userId = context.user.id;
    const subscriptionsCol = await getSubscriptions();

    // Use aggregation to join subscriptions with experiments in one query
    const docs = await subscriptionsCol
      .aggregate<SubscriptionWithExperimentDoc>([
        {
          $match: {
            userId,
            status: "started",
          },
        },
        {
          $lookup: {
            from: "experiments",
            localField: "experimentId",
            foreignField: "_id",
            as: "experiment",
          },
        },
        { $unwind: "$experiment" },
        { $match: { "experiment.status": "published" } },
      ])
      .toArray();

    const results: TodayTasksGroup[] = [];

    for (const doc of docs) {
      if (!doc.startedAt) continue;

      const currentDay = calculateCurrentDay(doc.startedAt);

      // Check if experiment is completed
      if (currentDay > doc.experiment.days.length) {
        await subscriptionsCol.updateOne(
          { _id: doc._id },
          { $set: { status: "completed", endedAt: new Date() } },
        );
        continue;
      }

      // Find the day's tasks
      const day = doc.experiment.days.find((d) => d.dayNumber === currentDay);
      if (!day || !day.tasks.length) continue;

      results.push({
        subscription: serializeSubscription(doc as SubscriptionDoc),
        experiment: serializeExperiment(doc.experiment) as PublishedExperiment,
        currentDay,
        totalDays: doc.experiment.days.length,
        tasks: day.tasks.map(serializeTask),
      });
    }

    return results;
  });

// Offer an experiment to a user (creates a new subscription)
export const offerExperimentToUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: { experimentId: string }) => data)
  .handler(
    async ({ data: { experimentId }, context }): Promise<Subscription> => {
      const userId = context.user.id;
      const subscriptionsCol = await getSubscriptions();

      // Check if there's already an active subscription
      const existing = await subscriptionsCol.findOne({
        userId,
        experimentId: new ObjectId(experimentId),
        status: { $in: ["offered", "started"] },
      });

      if (existing) {
        throw new Error(
          "User already has an active subscription for this experiment",
        );
      }

      const now = new Date();
      const result = await subscriptionsCol.insertOne({
        userId,
        experimentId: new ObjectId(experimentId),
        status: "offered",
        offeredAt: now,
        completions: [],
        createdAt: now,
        updatedAt: now,
      } as unknown as SubscriptionDoc);

      const subscription = await subscriptionsCol.findOne({
        _id: result.insertedId,
      });
      if (!subscription) {
        throw new Error("Failed to create subscription");
      }
      return serializeSubscription(subscription);
    },
  );

// ============ Task Completion Functions ============

// Complete a task (for tasks without input blocks — idempotent, no journal entry)
export const completeTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    (data: {
      subscriptionId: string;
      taskId: string;
      dayNumber: number;
    }) => data,
  )
  .handler(async ({ data, context }): Promise<TaskCompletion> => {
    const userId = context.user.id;
    const subscriptionsCol = await getSubscriptions();

    const now = new Date();
    const subscriptionIdObj = new ObjectId(data.subscriptionId);

    // Check if completion already exists for this task/day
    const subscription = await subscriptionsCol.findOne({
      _id: subscriptionIdObj,
      userId,
    });

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    const existing = (subscription.completions || []).find(
      (c) => c.taskId === data.taskId && c.dayNumber === data.dayNumber,
    );

    if (existing) {
      // Already completed — return existing (idempotent)
      return serializeCompletion(existing);
    }

    const completion: TaskCompletionEntry = {
      taskId: data.taskId,
      dayNumber: data.dayNumber,
      firstCompletedAt: now,
      responseCount: 0,
    };

    await subscriptionsCol.updateOne(
      { _id: subscriptionIdObj },
      {
        $push: { completions: completion },
        $set: { updatedAt: now },
      },
    );

    return serializeCompletion(completion);
  });

// Submit a task response (allows multiple responses per task/day)
export const submitTaskResponse = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    (data: {
      subscriptionId: string;
      taskId: string;
      dayNumber: number;
      responses: Record<string, string>;
    }) => data,
  )
  .handler(async ({ data, context }): Promise<TaskCompletion> => {
    const userId = context.user.id;
    const client = await getClient();
    const subscriptionsCol = await getSubscriptions();
    const journalCol = await getJournal();

    const now = new Date();
    const subscriptionIdObj = new ObjectId(data.subscriptionId);

    const session = client.startSession();

    let resultCompletion: TaskCompletion;

    try {
      session.startTransaction();

      // Verify subscription exists and belongs to user
      const subscription = await subscriptionsCol.findOne(
        { _id: subscriptionIdObj, userId },
        { session },
      );

      if (!subscription) {
        throw new Error("Subscription not found");
      }

      // Check if a completion entry already exists for this task/day
      const existing = (subscription.completions || []).find(
        (c) => c.taskId === data.taskId && c.dayNumber === data.dayNumber,
      );

      if (existing) {
        // Increment responseCount on existing completion
        await subscriptionsCol.updateOne(
          {
            _id: subscriptionIdObj,
            "completions.taskId": data.taskId,
            "completions.dayNumber": data.dayNumber,
          },
          {
            $inc: { "completions.$.responseCount": 1 },
            $set: { updatedAt: now },
          },
          { session },
        );

        resultCompletion = {
          taskId: existing.taskId,
          dayNumber: existing.dayNumber,
          firstCompletedAt: existing.firstCompletedAt,
          responseCount: existing.responseCount + 1,
        };
      } else {
        // Create new completion entry
        const completion: TaskCompletionEntry = {
          taskId: data.taskId,
          dayNumber: data.dayNumber,
          firstCompletedAt: now,
          responseCount: 1,
        };

        await subscriptionsCol.updateOne(
          { _id: subscriptionIdObj },
          {
            $push: { completions: completion },
            $set: { updatedAt: now },
          },
          { session },
        );

        resultCompletion = serializeCompletion(completion);
      }

      // Insert a new journal entry (one per response submission)
      await journalCol.insertOne(
        {
          userId,
          subscriptionId: subscriptionIdObj,
          experimentId: subscription.experimentId,
          taskId: data.taskId,
          dayNumber: data.dayNumber,
          date: now,
          responses: data.responses,
          createdAt: now,
          updatedAt: now,
        } as unknown as import("../db/types").JournalEntryDoc,
        { session },
      );

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    return resultCompletion;
  });

// Uncomplete a task (undo)
export const uncompleteTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    (data: { subscriptionId: string; taskId: string; dayNumber: number }) =>
      data,
  )
  .handler(async ({ data, context }): Promise<{ success: boolean }> => {
    const userId = context.user.id;
    const client = await getClient();
    const subscriptionsCol = await getSubscriptions();
    const journalCol = await getJournal();

    const subscriptionIdObj = new ObjectId(data.subscriptionId);

    const session = client.startSession();

    try {
      session.startTransaction();

      // Remove completion from subscription
      await subscriptionsCol.updateOne(
        {
          _id: subscriptionIdObj,
          userId,
        },
        {
          $pull: {
            completions: { taskId: data.taskId, dayNumber: data.dayNumber },
          },
          $set: { updatedAt: new Date() },
        },
        { session },
      );

      // Delete all journal entries for this task/day
      await journalCol.deleteMany(
        {
          userId,
          subscriptionId: subscriptionIdObj,
          taskId: data.taskId,
          dayNumber: data.dayNumber,
        },
        { session },
      );

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    return { success: true };
  });

// ============ Admin Subscription Functions ============

// Admin: Get subscriptions for a specific user (with experiment details)
export const adminGetUserSubscriptions = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator((data: string) => data)
  .handler(async ({ data: userId }): Promise<SubscriptionWithExperiment[]> => {
    const subscriptionsCol = await getSubscriptions();

    const docs = await subscriptionsCol
      .aggregate<SubscriptionWithExperimentDoc>([
        { $match: { userId } },
        {
          $lookup: {
            from: "experiments",
            localField: "experimentId",
            foreignField: "_id",
            as: "experiment",
          },
        },
        { $unwind: "$experiment" },
        { $sort: { createdAt: -1 } },
      ])
      .toArray();

    return docs.map((doc) => {
      const currentDay =
        doc.status === "started" && doc.startedAt
          ? calculateCurrentDay(doc.startedAt)
          : null;

      return {
        id: doc._id.toString(),
        userId: doc.userId,
        experimentId: serializeExperiment(
          doc.experiment,
        ) as PublishedExperiment,
        status: doc.status,
        offeredAt: doc.offeredAt,
        startedAt: doc.startedAt,
        endedAt: doc.endedAt,
        completions: (doc.completions || []).map(serializeCompletion),
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        currentDay,
      };
    });
  });

// Admin: Subscribe a user to an experiment
export const adminSubscribeUser = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator((data: { userId: string; experimentId: string }) => data)
  .handler(async ({ data }): Promise<Subscription> => {
    const subscriptionsCol = await getSubscriptions();
    const experimentsCol = await getExperiments();

    // Verify experiment exists and is published
    const experiment = await experimentsCol.findOne({
      _id: new ObjectId(data.experimentId),
      status: "published",
    });

    if (!experiment) {
      throw new Error("Experiment not found or not published");
    }

    // Check if there's already an active subscription
    const existing = await subscriptionsCol.findOne({
      userId: data.userId,
      experimentId: new ObjectId(data.experimentId),
      status: { $in: ["offered", "started"] },
    });

    if (existing) {
      throw new Error(
        "User already has an active subscription for this experiment",
      );
    }

    const now = new Date();
    const result = await subscriptionsCol.insertOne({
      userId: data.userId,
      experimentId: new ObjectId(data.experimentId),
      status: "offered",
      offeredAt: now,
      completions: [],
      createdAt: now,
      updatedAt: now,
    } as unknown as SubscriptionDoc);

    const subscription = await subscriptionsCol.findOne({
      _id: result.insertedId,
    });
    if (!subscription) {
      throw new Error("Failed to create subscription");
    }
    return serializeSubscription(subscription);
  });

// Admin: Remove a subscription
export const adminRemoveSubscription = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator((data: string) => data)
  .handler(async ({ data: subscriptionId }): Promise<void> => {
    const subscriptionsCol = await getSubscriptions();

    const result = await subscriptionsCol.deleteOne({
      _id: new ObjectId(subscriptionId),
    });

    if (result.deletedCount === 0) {
      throw new Error("Subscription not found");
    }
  });
