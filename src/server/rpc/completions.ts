import { createServerFn } from "@tanstack/react-start";

import { TaskCompletion } from "../db/models";
import { serialize } from "../db/serialize";

// Complete a task
export const completeTask = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      userId: string;
      subscriptionId: string;
      taskId: string;
      dayNumber: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    const completion = await TaskCompletion.findOneAndUpdate(
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
      { upsert: true, new: true },
    ).lean();

    return serialize(completion);
  });

// Uncomplete a task (undo)
export const uncompleteTask = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      userId: string;
      subscriptionId: string;
      taskId: string;
      dayNumber: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    await TaskCompletion.deleteOne({
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
      data,
  )
  .handler(async ({ data }) => {
    const completions = await TaskCompletion.find({
      userId: data.userId,
      subscriptionId: data.subscriptionId,
      dayNumber: data.dayNumber,
    }).lean();

    return serialize(completions);
  });

// Get all completions for today across all subscriptions
export const getTodayCompletions = createServerFn({ method: "POST" })
  .inputValidator((data: string) => data)
  .handler(async ({ data: userId }) => {
    // Get today's completions (we'll filter by dayNumber on the client since
    // each subscription may have a different current day)
    const completions = await TaskCompletion.find({ userId }).lean();

    return serialize(completions);
  });
