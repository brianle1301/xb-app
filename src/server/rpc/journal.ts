import { createServerFn } from "@tanstack/react-start";
import { ObjectId } from "mongodb";

import type { Task } from "@/types/shared";

import { getExperiments, getJournalEntries } from "../db/client";
import type { ExperimentDoc, TaskDoc } from "../db/types";
import { type Experiment, serializeExperiment, serializeTask } from "./experiments";

// ============ Types ============

export interface JournalEntry_ {
  _id: string;
  userId: string;
  subscriptionId: string;
  experimentId: string;
  taskId: string;
  dayNumber: number;
  date: Date;
  responses: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

// Journal entry with populated experiment and task
export interface JournalEntryWithDetails extends Omit<JournalEntry_, "experimentId" | "taskId"> {
  experimentId: Experiment;
  taskId: Task;
}

// ============ Helpers ============

// Helper to find a task within an experiment by taskId
function findTaskInExperiment(experiment: ExperimentDoc, taskId: ObjectId): TaskDoc | null {
  for (const day of experiment.days) {
    for (const task of day.tasks) {
      if (task._id && task._id.equals(taskId)) {
        return task;
      }
    }
  }
  return null;
}

// ============ RPC Functions ============

export const getJournalEntriesByDate = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string; date: string }) => data)
  .handler(
    async ({ data: { userId, date: dateStr } }): Promise<JournalEntryWithDetails[]> => {
      const date = new Date(dateStr);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const journalEntriesCol = await getJournalEntries();
      const experimentsCol = await getExperiments();

      const entries = await journalEntriesCol
        .find({
          userId,
          date: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        })
        .sort({ date: -1 })
        .toArray();

      const results: JournalEntryWithDetails[] = [];

      for (const entry of entries) {
        // Populate experiment
        const experiment = await experimentsCol.findOne({ _id: entry.experimentId });
        if (!experiment) continue;

        // Find task within experiment
        const task = findTaskInExperiment(experiment, entry.taskId);
        if (!task) continue;

        results.push({
          _id: entry._id.toString(),
          userId: entry.userId,
          subscriptionId: entry.subscriptionId.toString(),
          experimentId: serializeExperiment(experiment),
          taskId: serializeTask(task),
          dayNumber: entry.dayNumber,
          date: entry.date,
          responses: entry.responses || {},
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        });
      }

      return results;
    },
  );
