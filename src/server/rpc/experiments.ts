import { createServerFn } from "@tanstack/react-start";

import { connectDB } from "../db/connection";
import { Experiment, Task } from "../db/models";

export const listExperimentsByBox = createServerFn({ method: "GET" })
  .validator((boxId: string) => boxId)
  .handler(async ({ data: boxId }) => {
    await connectDB()();
    const experiments = await Experiment.find({ boxId }).lean();
    return experiments;
  });

export const getExperimentWithTasks = createServerFn({ method: "GET" })
  .validator((experimentId: string) => experimentId)
  .handler(async ({ data: experimentId }) => {
    await connectDB()();
    const experiment = await Experiment.findById(experimentId).lean();
    if (!experiment) {
      throw new Error("Experiment not found");
    }

    // Get first day's tasks
    const firstDay = experiment.days[0];
    if (!firstDay) {
      return { ...experiment, tasks: [] };
    }

    const tasks = await Task.find({ _id: { $in: firstDay.tasks } })
      .sort({ order: 1 })
      .lean();

    return { ...experiment, tasks };
  });

export const listAllExperiments = createServerFn({ method: "GET" }).handler(
  async () => {
    await connectDB()();
    const experiments = await Experiment.find().lean();
    return experiments;
  },
);

// Get all first day tasks for all experiments (for Today tab)
export const getTodayTasks = createServerFn({ method: "GET" }).handler(
  async () => {
    await connectDB()();
    const experiments = await Experiment.find().populate("boxId").lean();

    const tasksGroupedByExperiment = await Promise.all(
      experiments.map(async (experiment) => {
        const firstDay = experiment.days[0];
        if (!firstDay || !firstDay.tasks.length) {
          return null;
        }

        const tasks = await Task.find({ _id: { $in: firstDay.tasks } })
          .sort({ order: 1 })
          .lean();

        return {
          experiment,
          tasks,
        };
      }),
    );

    return tasksGroupedByExperiment.filter(Boolean);
  },
);
