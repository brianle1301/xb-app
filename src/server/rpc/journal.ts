import { createServerFn } from "@tanstack/react-start";

import type { Task } from "@/types/shared";

import {
  type ExperimentDoc,
  JournalEntry,
  type JournalEntryDoc,
  type TaskDoc,
} from "../db/models";
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

// ============ Serialization ============

// Type for journal entry with populated experiment and task
interface JournalEntryWithPopulatedDoc extends Omit<JournalEntryDoc, "experimentId" | "taskId"> {
  experimentId: ExperimentDoc;
  taskId: TaskDoc;
}

function serializeJournalEntryWithDetails(doc: JournalEntryWithPopulatedDoc): JournalEntryWithDetails {
  return {
    _id: doc._id.toString(),
    userId: doc.userId,
    subscriptionId: doc.subscriptionId.toString(),
    experimentId: serializeExperiment(doc.experimentId),
    taskId: serializeTask(doc.taskId),
    dayNumber: doc.dayNumber,
    date: doc.date,
    responses: doc.responses || {},
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// ============ RPC Functions ============

export const getJournalEntriesByDate = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string; date: string }) => data)
  .handler(
    async ({ data: { userId, date: dateStr } }): Promise<JournalEntryWithDetails[]> => {
      const date = new Date(dateStr);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      const entries = await JournalEntry.find({
        userId,
        date: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      })
        .populate("experimentId")
        .populate("taskId")
        .sort({ date: -1 })
        .lean<JournalEntryWithPopulatedDoc[]>();

      return entries.map(serializeJournalEntryWithDetails);
    },
  );
