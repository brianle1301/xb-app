import { createServerFn } from "@tanstack/react-start";

import { connectDB } from "../db/connection";
import { Experiment, Subscription } from "../db/models";
import { serialize } from "../db/serialize";

// Helper to get start of day (midnight)
function getStartOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper to calculate current day number for a subscription
export function calculateCurrentDay(startedAt: Date): number {
  const now = getStartOfDay();
  const start = getStartOfDay(startedAt);
  const diffTime = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Day 1 is the first day
}

// Get all subscriptions for a user (with experiment details)
export const getUserSubscriptions = createServerFn({ method: "POST" })
  .inputValidator((data: string) => data)
  .handler(async ({ data: userId }) => {
    await connectDB();

    const subscriptions = await Subscription.find({
      userId,
      status: { $in: ["offered", "started"] },
    })
      .populate({
        path: "experimentId",
        populate: { path: "boxId" },
      })
      .lean();

    // Check for started subscriptions that should be marked as completed
    const result = await Promise.all(
      subscriptions.map(async (sub) => {
        if (sub.status === "started" && sub.startedAt) {
          const experiment = sub.experimentId as any;
          const currentDay = calculateCurrentDay(sub.startedAt);

          if (currentDay > experiment.days.length) {
            // Mark as completed
            await Subscription.findByIdAndUpdate(sub._id, {
              status: "completed",
              endedAt: new Date(),
            });
            return null; // Don't include in active subscriptions
          }

          return { ...sub, currentDay };
        }
        return { ...sub, currentDay: null };
      }),
    );

    return serialize(result.filter(Boolean));
  });

// Start a subscription (transition from offered to started)
export const startSubscription = createServerFn({ method: "POST" })
  .inputValidator((data: { subscriptionId: string }) => data)
  .handler(async ({ data: { subscriptionId } }) => {
    await connectDB();

    const startedAt = getStartOfDay();

    const subscription = await Subscription.findOneAndUpdate(
      { _id: subscriptionId, status: "offered" },
      { status: "started", startedAt },
      { new: true },
    ).lean();

    if (!subscription) {
      throw new Error("Subscription not found or not in offered state");
    }

    return serialize(subscription);
  });

// Abandon a subscription
export const abandonSubscription = createServerFn({ method: "POST" })
  .inputValidator((data: { subscriptionId: string }) => data)
  .handler(async ({ data: { subscriptionId } }) => {
    await connectDB();

    const subscription = await Subscription.findOneAndUpdate(
      { _id: subscriptionId, status: "started" },
      { status: "abandoned", endedAt: new Date() },
      { new: true },
    ).lean();

    if (!subscription) {
      throw new Error("Subscription not found or not in started state");
    }

    return serialize(subscription);
  });

// Get today's tasks based on user's active subscriptions
export const getTodayTasksForUser = createServerFn({ method: "POST" })
  .inputValidator((data: string) => data)
  .handler(async ({ data: userId }) => {
    await connectDB();

    // Get all started subscriptions for the user with populated experiment
    const subscriptions = await Subscription.find({
      userId,
      status: "started",
    })
      .populate({
        path: "experimentId",
        populate: { path: "boxId" },
      })
      .lean();

    const tasksGroupedBySubscription = await Promise.all(
      subscriptions.map(async (sub) => {
        if (!sub.startedAt) return null;

        const experiment = sub.experimentId as any;
        const currentDay = calculateCurrentDay(sub.startedAt);

        // Check if experiment is completed
        if (currentDay > experiment.days.length) {
          await Subscription.findByIdAndUpdate(sub._id, {
            status: "completed",
            endedAt: new Date(),
          });
          return null;
        }

        // Find the day's tasks (tasks are now inlined in experiment.days)
        const day = experiment.days.find(
          (d: any) => d.dayNumber === currentDay,
        );
        if (!day || !day.tasks.length) return null;

        return {
          subscription: sub,
          experiment,
          currentDay,
          totalDays: experiment.days.length,
          tasks: day.tasks, // Tasks are already inlined
        };
      }),
    );

    return serialize(tasksGroupedBySubscription.filter(Boolean));
  });

// Offer an experiment to a user (creates a new subscription)
export const offerExperimentToUser = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string; experimentId: string }) => data)
  .handler(async ({ data: { userId, experimentId } }) => {
    await connectDB();

    // Check if there's already an active subscription
    const existing = await Subscription.findOne({
      userId,
      experimentId,
      status: { $in: ["offered", "started"] },
    }).lean();

    if (existing) {
      throw new Error(
        "User already has an active subscription for this experiment",
      );
    }

    const doc = await Subscription.create({
      userId,
      experimentId,
      status: "offered",
      offeredAt: new Date(),
    });

    const subscription = await Subscription.findById(doc._id).lean();
    return serialize(subscription);
  });

// Auto-offer all experiments to a user (for initial setup)
export const offerAllExperimentsToUser = createServerFn({ method: "POST" })
  .inputValidator((data: string) => data)
  .handler(async ({ data: userId }) => {
    await connectDB();

    const experiments = await Experiment.find().lean();

    const subscriptionIds = await Promise.all(
      experiments.map(async (experiment) => {
        const existing = await Subscription.findOne({
          userId,
          experimentId: experiment._id,
          status: { $in: ["offered", "started"] },
        }).lean();

        if (existing) return existing._id;

        const doc = await Subscription.create({
          userId,
          experimentId: experiment._id,
          status: "offered",
          offeredAt: new Date(),
        });
        return doc._id;
      }),
    );

    const subscriptions = await Subscription.find({
      _id: { $in: subscriptionIds },
    }).lean();

    return serialize(subscriptions);
  });
