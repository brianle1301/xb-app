import { createServerFn } from "@tanstack/react-start";
import { Types } from "mongoose";

import type { Task } from "@/types/shared";

import {
  type BoxDoc,
  type ExperimentDoc,
  Experiment,
  type SubscriptionDoc,
  Subscription as SubscriptionModel,
  type TaskDoc,
} from "../db/models";
import { type ExperimentWithBox, serializeExperimentWithBox, serializeTask } from "./experiments";

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

// Type for subscription with populated experiment (which has populated box)
interface SubscriptionWithExperimentDoc extends Omit<SubscriptionDoc, "experimentId"> {
  experimentId: Omit<ExperimentDoc, "boxId"> & { boxId: BoxDoc };
}

// Type guard to check if experimentId is populated
function isPopulatedExperiment(experimentId: Types.ObjectId | ExperimentDoc): experimentId is ExperimentDoc {
  return typeof experimentId === "object" && "name" in experimentId;
}

function serializeSubscription(doc: SubscriptionDoc): Subscription {
  // Handle experimentId which might be ObjectId or populated ExperimentDoc
  const experimentId = isPopulatedExperiment(doc.experimentId)
    ? doc.experimentId._id.toString()
    : doc.experimentId.toString();

  return {
    _id: doc._id.toString(),
    userId: doc.userId,
    experimentId,
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
  experiment: Omit<ExperimentDoc, "boxId"> & { boxId: BoxDoc },
  currentDay: number,
  totalDays: number,
  tasks: TaskDoc[],
): TodayTasksGroup {
  // Handle experimentId which might be ObjectId or populated ExperimentDoc
  const experimentId = isPopulatedExperiment(subscription.experimentId)
    ? subscription.experimentId._id.toString()
    : subscription.experimentId.toString();

  return {
    subscription: {
      _id: subscription._id.toString(),
      userId: subscription.userId,
      experimentId,
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

// ============ RPC Functions ============

// Get all subscriptions for a user (with experiment details)
export const getUserSubscriptions = createServerFn({ method: "POST" })
  .inputValidator((data: string) => data)
  .handler(async ({ data: userId }): Promise<SubscriptionWithExperiment[]> => {
    const subscriptions = await SubscriptionModel.find({
      userId,
      status: { $in: ["offered", "started"] },
    })
      .populate({
        path: "experimentId",
        populate: { path: "boxId" },
      })
      .lean<SubscriptionWithExperimentDoc[]>();

    // Check for started subscriptions that should be marked as completed
    const results: SubscriptionWithExperiment[] = [];

    for (const sub of subscriptions) {
      if (sub.status === "started" && sub.startedAt) {
        const experiment = sub.experimentId;
        const currentDay = calculateCurrentDay(sub.startedAt);

        if (currentDay > experiment.days.length) {
          // Mark as completed
          await SubscriptionModel.findByIdAndUpdate(sub._id, {
            status: "completed",
            endedAt: new Date(),
          });
          continue; // Don't include in active subscriptions
        }

        results.push(serializeSubscriptionWithExperiment(sub, currentDay));
      } else {
        results.push(serializeSubscriptionWithExperiment(sub, null));
      }
    }

    return results;
  });

// Start a subscription (transition from offered to started)
export const startSubscription = createServerFn({ method: "POST" })
  .inputValidator((data: { subscriptionId: string }) => data)
  .handler(async ({ data: { subscriptionId } }): Promise<Subscription> => {
    const startedAt = getStartOfDay();

    const subscription = await SubscriptionModel.findOneAndUpdate(
      { _id: subscriptionId, status: "offered" },
      { status: "started", startedAt },
      { new: true },
    ).lean<SubscriptionDoc>();

    if (!subscription) {
      throw new Error("Subscription not found or not in offered state");
    }

    return serializeSubscription(subscription);
  });

// Abandon a subscription
export const abandonSubscription = createServerFn({ method: "POST" })
  .inputValidator((data: { subscriptionId: string }) => data)
  .handler(async ({ data: { subscriptionId } }): Promise<Subscription> => {
    const subscription = await SubscriptionModel.findOneAndUpdate(
      { _id: subscriptionId, status: "started" },
      { status: "abandoned", endedAt: new Date() },
      { new: true },
    ).lean<SubscriptionDoc>();

    if (!subscription) {
      throw new Error("Subscription not found or not in started state");
    }

    return serializeSubscription(subscription);
  });

// Get today's tasks based on user's active subscriptions
export const getTodayTasksForUser = createServerFn({ method: "POST" })
  .inputValidator((data: string) => data)
  .handler(async ({ data: userId }): Promise<TodayTasksGroup[]> => {
    // Get all started subscriptions for the user with populated experiment
    const subscriptions = await SubscriptionModel.find({
      userId,
      status: "started",
    })
      .populate({
        path: "experimentId",
        populate: { path: "boxId" },
      })
      .lean<SubscriptionWithExperimentDoc[]>();

    const results: TodayTasksGroup[] = [];

    for (const sub of subscriptions) {
      if (!sub.startedAt) continue;

      const experiment = sub.experimentId;
      const currentDay = calculateCurrentDay(sub.startedAt);

      // Check if experiment is completed
      if (currentDay > experiment.days.length) {
        await SubscriptionModel.findByIdAndUpdate(sub._id, {
          status: "completed",
          endedAt: new Date(),
        });
        continue;
      }

      // Find the day's tasks (tasks are now inlined in experiment.days)
      const day = experiment.days.find(
        (d) => d.dayNumber === currentDay,
      );
      if (!day || !day.tasks.length) continue;

      results.push(
        serializeTodayTasksGroup(
          sub,
          experiment,
          currentDay,
          experiment.days.length,
          day.tasks,
        ),
      );
    }

    return results;
  });

// Offer an experiment to a user (creates a new subscription)
export const offerExperimentToUser = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string; experimentId: string }) => data)
  .handler(async ({ data: { userId, experimentId } }): Promise<Subscription> => {
    // Check if there's already an active subscription
    const existing = await SubscriptionModel.findOne({
      userId,
      experimentId,
      status: { $in: ["offered", "started"] },
    }).lean<SubscriptionDoc>();

    if (existing) {
      throw new Error(
        "User already has an active subscription for this experiment",
      );
    }

    const doc = await SubscriptionModel.create({
      userId,
      experimentId,
      status: "offered",
      offeredAt: new Date(),
    });

    const subscription = await SubscriptionModel.findById(doc._id).lean<SubscriptionDoc>();
    if (!subscription) {
      throw new Error("Failed to create subscription");
    }
    return serializeSubscription(subscription);
  });

// Auto-offer all experiments to a user (for initial setup)
export const offerAllExperimentsToUser = createServerFn({ method: "POST" })
  .inputValidator((data: string) => data)
  .handler(async ({ data: userId }): Promise<Subscription[]> => {
    const experiments = await Experiment.find().lean<ExperimentDoc[]>();

    const subscriptionIds = await Promise.all(
      experiments.map(async (experiment) => {
        const existing = await SubscriptionModel.findOne({
          userId,
          experimentId: experiment._id,
          status: { $in: ["offered", "started"] },
        }).lean<SubscriptionDoc>();

        if (existing) return existing._id;

        const doc = await SubscriptionModel.create({
          userId,
          experimentId: experiment._id,
          status: "offered",
          offeredAt: new Date(),
        });
        return doc._id;
      }),
    );

    const subscriptions = await SubscriptionModel.find({
      _id: { $in: subscriptionIds },
    }).lean<SubscriptionDoc[]>();

    return subscriptions.map(serializeSubscription);
  });
