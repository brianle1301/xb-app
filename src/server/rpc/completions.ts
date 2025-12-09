import { createServerFn } from "@tanstack/react-start";
import { ObjectId } from "mongodb";

import { getJournalEntries, getSubscriptions, getTaskCompletions } from "../db/client";
import type { TaskCompletionDoc } from "../db/types";

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
    const taskCompletionsCol = await getTaskCompletions();
    const subscriptionsCol = await getSubscriptions();
    const journalEntriesCol = await getJournalEntries();

    const now = new Date();

    // Create or update completion record
    const completion = await taskCompletionsCol.findOneAndUpdate(
      {
        userId: data.userId,
        subscriptionId: new ObjectId(data.subscriptionId),
        taskId: new ObjectId(data.taskId),
        dayNumber: data.dayNumber,
      },
      {
        $set: {
          userId: data.userId,
          subscriptionId: new ObjectId(data.subscriptionId),
          taskId: new ObjectId(data.taskId),
          dayNumber: data.dayNumber,
          completedAt: now,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    if (!completion) {
      throw new Error("Failed to create completion");
    }

    // Get subscription to find experimentId
    const subscription = await subscriptionsCol.findOne({
      _id: new ObjectId(data.subscriptionId),
    });
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    // Create or update journal entry
    await journalEntriesCol.findOneAndUpdate(
      {
        userId: data.userId,
        subscriptionId: new ObjectId(data.subscriptionId),
        taskId: new ObjectId(data.taskId),
        dayNumber: data.dayNumber,
      },
      {
        $set: {
          userId: data.userId,
          subscriptionId: new ObjectId(data.subscriptionId),
          experimentId: subscription.experimentId,
          taskId: new ObjectId(data.taskId),
          dayNumber: data.dayNumber,
          date: now,
          responses: data.responses || {},
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
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
    const taskCompletionsCol = await getTaskCompletions();
    const journalEntriesCol = await getJournalEntries();

    // Delete completion record
    await taskCompletionsCol.deleteOne({
      userId: data.userId,
      subscriptionId: new ObjectId(data.subscriptionId),
      taskId: new ObjectId(data.taskId),
      dayNumber: data.dayNumber,
    });

    // Delete journal entry
    await journalEntriesCol.deleteOne({
      userId: data.userId,
      subscriptionId: new ObjectId(data.subscriptionId),
      taskId: new ObjectId(data.taskId),
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
    const taskCompletionsCol = await getTaskCompletions();

    const completions = await taskCompletionsCol
      .find({
        userId: data.userId,
        subscriptionId: new ObjectId(data.subscriptionId),
        dayNumber: data.dayNumber,
      })
      .toArray();

    return completions.map(serializeTaskCompletion);
  });

// Get all completions for today across all subscriptions
export const getTodayCompletions = createServerFn({ method: "POST" })
  .inputValidator((data: string) => data)
  .handler(async ({ data: userId }): Promise<TaskCompletion[]> => {
    const taskCompletionsCol = await getTaskCompletions();

    // Get today's completions (we'll filter by dayNumber on the client since
    // each subscription may have a different current day)
    const completions = await taskCompletionsCol.find({ userId }).toArray();

    return completions.map(serializeTaskCompletion);
  });
