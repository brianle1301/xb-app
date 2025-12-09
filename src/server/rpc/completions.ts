import { createServerFn } from "@tanstack/react-start";

import {
  JournalEntry,
  Subscription,
  type SubscriptionDoc,
  TaskCompletion as TaskCompletionModel,
  type TaskCompletionDoc,
} from "../db/models";

// ============ Types ============

export interface TaskCompletion {
  _id: string;
  userId: string;
  subscriptionId: string;
  taskId: string;
  dayNumber: number;
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============ Serialization ============

function serializeTaskCompletion(doc: TaskCompletionDoc): TaskCompletion {
  return {
    _id: doc._id.toString(),
    userId: doc.userId,
    subscriptionId: doc.subscriptionId.toString(),
    taskId: doc.taskId.toString(),
    dayNumber: doc.dayNumber,
    completedAt: doc.completedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// ============ RPC Functions ============

// Complete a task
export const completeTask = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      userId: string;
      subscriptionId: string;
      taskId: string;
      dayNumber: number;
      responses?: Record<string, string>;
    }) => data
  )
  .handler(async ({ data }): Promise<TaskCompletion> => {
    // Create completion record
    const completion = await TaskCompletionModel.findOneAndUpdate(
      {
        userId: data.userId,
        subscriptionId: data.subscriptionId,
        taskId: data.taskId,
        dayNumber: data.dayNumber,
      },
      {
        userId: data.userId,
        subscriptionId: data.subscriptionId,
        taskId: data.taskId,
        dayNumber: data.dayNumber,
        completedAt: new Date(),
      },
      { upsert: true, new: true }
    ).lean<TaskCompletionDoc>();

    if (!completion) {
      throw new Error("Failed to create completion");
    }

    // Get subscription to find experimentId
    const subscription = await Subscription.findById(
      data.subscriptionId
    ).lean<SubscriptionDoc>();
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    // Create journal entry
    await JournalEntry.findOneAndUpdate(
      {
        userId: data.userId,
        subscriptionId: data.subscriptionId,
        taskId: data.taskId,
        dayNumber: data.dayNumber,
      },
      {
        userId: data.userId,
        subscriptionId: data.subscriptionId,
        experimentId: subscription.experimentId,
        taskId: data.taskId,
        dayNumber: data.dayNumber,
        date: new Date(),
        responses: data.responses || {},
      },
      { upsert: true, new: true }
    );

    return serializeTaskCompletion(completion);
  });

// Uncomplete a task (undo)
export const uncompleteTask = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      userId: string;
      subscriptionId: string;
      taskId: string;
      dayNumber: number;
    }) => data
  )
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    // Delete completion record
    await TaskCompletionModel.deleteOne({
      userId: data.userId,
      subscriptionId: data.subscriptionId,
      taskId: data.taskId,
      dayNumber: data.dayNumber,
    });

    // Delete journal entry
    await JournalEntry.deleteOne({
      userId: data.userId,
      subscriptionId: data.subscriptionId,
      taskId: data.taskId,
      dayNumber: data.dayNumber,
    });

    return { success: true };
  });

// Get completions for a user's subscription on a specific day
export const getCompletionsForDay = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { userId: string; subscriptionId: string; dayNumber: number }) =>
      data
  )
  .handler(async ({ data }): Promise<TaskCompletion[]> => {
    const completions = await TaskCompletionModel.find({
      userId: data.userId,
      subscriptionId: data.subscriptionId,
      dayNumber: data.dayNumber,
    }).lean<TaskCompletionDoc[]>();

    return completions.map(serializeTaskCompletion);
  });

// Get all completions for today across all subscriptions
export const getTodayCompletions = createServerFn({ method: "POST" })
  .inputValidator((data: string) => data)
  .handler(async ({ data: userId }): Promise<TaskCompletion[]> => {
    // Get today's completions (we'll filter by dayNumber on the client since
    // each subscription may have a different current day)
    const completions = await TaskCompletionModel.find({ userId }).lean<
      TaskCompletionDoc[]
    >();

    return completions.map(serializeTaskCompletion);
  });
