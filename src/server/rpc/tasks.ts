import { createServerFn } from "@tanstack/react-start";

import { connectDB } from "../db/connection";
import { Task } from "../db/models";

export const getTask = createServerFn({ method: "GET" })
  .validator((taskId: string) => taskId)
  .handler(async ({ data: taskId }) => {
    await connectDB()();
    const task = await Task.findById(taskId).lean();
    if (!task) {
      throw new Error("Task not found");
    }
    return task;
  });
