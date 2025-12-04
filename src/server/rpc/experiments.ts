import { createServerFn } from "@tanstack/react-start";

import { Experiment } from "../db/models";
import { serialize } from "../db/serialize";

export const listExperimentsByBox = createServerFn({ method: "POST" })
  .inputValidator((data: string) => data)
  .handler(async ({ data: boxId }) => {
    const experiments = await Experiment.find({ boxId }).lean();
    return serialize(experiments);
  });

export const getExperiment = createServerFn({ method: "POST" })
  .inputValidator((data: string) => data)
  .handler(async ({ data: experimentId }) => {
    const experiment = await Experiment.findById(experimentId).lean();
    if (!experiment) {
      throw new Error("Experiment not found");
    }
    return serialize(experiment);
  });

export const listAllExperiments = createServerFn({ method: "GET" }).handler(
  async () => {
    const experiments = await Experiment.find().lean();
    return serialize(experiments);
  },
);
