import { createServerFn } from "@tanstack/react-start";
import { ObjectId } from "mongodb";

import type { Task } from "@/types/shared";

import { getExperiments, getSubscriptions } from "../db/client";
import type {
  ExperimentDoc,
  ExperimentWithBoxDoc,
  SubscriptionDoc,
  SubscriptionWithExperimentDoc,
  TaskDoc,
} from "../db/types";
import {
  type ExperimentWithBox,
  populateExperimentWithBox,
  serializeExperimentWithBox,
  serializeTask,
} from "./experiments";

// ============ Types ============

export type SubscriptionStatus = "offered" | "started" | "completed" | "abandoned";

export interface Subscription {
  _id: string;
  userId: string;
  experimentId: string;
  status: SubscriptionStatus;
  offeredAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Subscription with populated experiment (and box)
export interface SubscriptionWithExperiment extends Omit<Subscription, "experimentId"> {
  experimentId: ExperimentWithBox;
  currentDay: number | null;
}

// Today tasks response
export interface TodayTasksGroup {
  subscription: Subscription;
  experiment: ExperimentWithBox;
  currentDay: number;
  totalDays: number;
  tasks: Task[];
}

// ============ Serialization ============

function serializeSubscription(doc: SubscriptionDoc): Subscription {
  return {
    _id: doc._id.toString(),
    userId: doc.userId,
    experimentId: doc.experimentId.toString(),
    status: doc.status,
    offeredAt: doc.offeredAt,
    startedAt: doc.startedAt,
    endedAt: doc.endedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function serializeSubscriptionWithExperiment(
  doc: SubscriptionWithExperimentDoc,
  currentDay: number | null,
): SubscriptionWithExperiment {
  return {
    _id: doc._id.toString(),
    userId: doc.userId,
    experimentId: serializeExperimentWithBox(doc.experimentId),
    status: doc.status,
    offeredAt: doc.offeredAt,
    startedAt: doc.startedAt,
    endedAt: doc.endedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    currentDay,
  };
}

function serializeTodayTasksGroup(
  subscription: SubscriptionDoc,
  experiment: ExperimentWithBoxDoc,
  currentDay: number,
  totalDays: number,
  tasks: TaskDoc[],
): TodayTasksGroup {
  return {
    subscription: {
      _id: subscription._id.toString(),
      userId: subscription.userId,
      experimentId: subscription.experimentId.toString(),
      status: subscription.status,
      offeredAt: subscription.offeredAt,
      startedAt: subscription.startedAt,
      endedAt: subscription.endedAt,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    },
    experiment: serializeExperimentWithBox(experiment),
    currentDay,
    totalDays,
    tasks: tasks.map(serializeTask),
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

// Helper to populate subscription with experiment and box
async function populateSubscription(
  subscription: SubscriptionDoc,
): Promise<SubscriptionWithExperimentDoc | null> {
  const experiments = await getExperiments();
  const experiment = await experiments.findOne({ _id: subscription.experimentId });
  if (!experiment) return null;

  const experimentWithBox = await populateExperimentWithBox(experiment);
  if (!experimentWithBox) return null;

  return {
    ...subscription,
    experimentId: experimentWithBox,
  };
}

// ============ RPC Functions ============

// Get all subscriptions for a user (with experiment details)
export const getUserSubscriptions = createServerFn({ method: "POST" })
  .inputValidator((data: string) => data)
  .handler(async ({ data: userId }): Promise<SubscriptionWithExperiment[]> => {
    const subscriptionsCol = await getSubscriptions();
    const subscriptions = await subscriptionsCol
      .find({
        userId,
        status: { $in: ["offered", "started"] },
      })
      .toArray();

    // Check for started subscriptions that should be marked as completed
    const results: SubscriptionWithExperiment[] = [];

    for (const sub of subscriptions) {
      const populated = await populateSubscription(sub);
      if (!populated) continue;

      if (sub.status === "started" && sub.startedAt) {
        const experiment = populated.experimentId;
        const currentDay = calculateCurrentDay(sub.startedAt);

        if (currentDay > experiment.days.length) {
          // Mark as completed
          await subscriptionsCol.updateOne(
            { _id: sub._id },
            { $set: { status: "completed", endedAt: new Date() } },
          );
          continue; // Don't include in active subscriptions
        }

        results.push(serializeSubscriptionWithExperiment(populated, currentDay));
      } else {
        results.push(serializeSubscriptionWithExperiment(populated, null));
      }
    }

    return results;
  });

// Start a subscription (transition from offered to started)
export const startSubscription = createServerFn({ method: "POST" })
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
  .inputValidator((data: { subscriptionId: string }) => data)
  .handler(async ({ data: { subscriptionId } }): Promise<Subscription> => {
    const subscriptionsCol = await getSubscriptions();

    const result = await subscriptionsCol.findOneAndUpdate(
      { _id: new ObjectId(subscriptionId), status: "started" },
      { $set: { status: "abandoned", endedAt: new Date(), updatedAt: new Date() } },
      { returnDocument: "after" },
    );

    if (!result) {
      throw new Error("Subscription not found or not in started state");
    }

    return serializeSubscription(result);
  });

// Get today's tasks based on user's active subscriptions
export const getTodayTasksForUser = createServerFn({ method: "POST" })
  .inputValidator((data: string) => data)
  .handler(async ({ data: userId }): Promise<TodayTasksGroup[]> => {
    const subscriptionsCol = await getSubscriptions();

    // Get all started subscriptions for the user
    const subscriptions = await subscriptionsCol
      .find({
        userId,
        status: "started",
      })
      .toArray();

    const results: TodayTasksGroup[] = [];

    for (const sub of subscriptions) {
      if (!sub.startedAt) continue;

      const populated = await populateSubscription(sub);
      if (!populated) continue;

      const experiment = populated.experimentId;
      const currentDay = calculateCurrentDay(sub.startedAt);

      // Check if experiment is completed
      if (currentDay > experiment.days.length) {
        await subscriptionsCol.updateOne(
          { _id: sub._id },
          { $set: { status: "completed", endedAt: new Date() } },
        );
        continue;
      }

      // Find the day's tasks (tasks are now inlined in experiment.days)
      const day = experiment.days.find((d) => d.dayNumber === currentDay);
      if (!day || !day.tasks.length) continue;

      results.push(
        serializeTodayTasksGroup(sub, experiment, currentDay, experiment.days.length, day.tasks),
      );
    }

    return results;
  });

// Offer an experiment to a user (creates a new subscription)
export const offerExperimentToUser = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string; experimentId: string }) => data)
  .handler(async ({ data: { userId, experimentId } }): Promise<Subscription> => {
    const subscriptionsCol = await getSubscriptions();

    // Check if there's already an active subscription
    const existing = await subscriptionsCol.findOne({
      userId,
      experimentId: new ObjectId(experimentId),
      status: { $in: ["offered", "started"] },
    });

    if (existing) {
      throw new Error("User already has an active subscription for this experiment");
    }

    const now = new Date();
    const result = await subscriptionsCol.insertOne({
      userId,
      experimentId: new ObjectId(experimentId),
      status: "offered",
      offeredAt: now,
      createdAt: now,
      updatedAt: now,
    } as SubscriptionDoc);

    const subscription = await subscriptionsCol.findOne({ _id: result.insertedId });
    if (!subscription) {
      throw new Error("Failed to create subscription");
    }
    return serializeSubscription(subscription);
  });

// Auto-offer all experiments to a user (for initial setup)
export const offerAllExperimentsToUser = createServerFn({ method: "POST" })
  .inputValidator((data: string) => data)
  .handler(async ({ data: userId }): Promise<Subscription[]> => {
    const experimentsCol = await getExperiments();
    const subscriptionsCol = await getSubscriptions();

    const experiments = await experimentsCol.find().toArray();

    const subscriptionIds = await Promise.all(
      experiments.map(async (experiment: ExperimentDoc) => {
        const existing = await subscriptionsCol.findOne({
          userId,
          experimentId: experiment._id,
          status: { $in: ["offered", "started"] },
        });

        if (existing) return existing._id;

        const now = new Date();
        const result = await subscriptionsCol.insertOne({
          userId,
          experimentId: experiment._id,
          status: "offered",
          offeredAt: now,
          createdAt: now,
          updatedAt: now,
        } as SubscriptionDoc);
        return result.insertedId;
      }),
    );

    const subscriptions = await subscriptionsCol
      .find({
        _id: { $in: subscriptionIds },
      })
      .toArray();

    return subscriptions.map(serializeSubscription);
  });
