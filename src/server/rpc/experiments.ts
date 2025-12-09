import { createServerFn } from "@tanstack/react-start";
import { ObjectId } from "mongodb";

import type { Block, ExperimentDay, LocalizedText, SelectOption, Task } from "@/types/shared";

import { getBoxes, getExperiments } from "../db/client";
import type {
  BlockDoc,
  ExperimentDayDoc,
  ExperimentDoc,
  ExperimentWithBoxDoc,
  SelectOptionDoc,
  TaskDoc,
} from "../db/types";
import { type Box, serializeBox } from "./boxes";

// ============ Types ============

export interface Experiment {
  _id: string;
  name: LocalizedText;
  description: LocalizedText;
  boxId: string;
  days: ExperimentDay[];
}

// Experiment with populated box
export interface ExperimentWithBox extends Omit<Experiment, "boxId"> {
  boxId: Box;
}

// ============ Serialization ============

function serializeSelectOption(doc: SelectOptionDoc): SelectOption {
  return {
    value: doc.value,
    label: {
      en: doc.label.en,
      es: doc.label.es,
    },
  };
}

function serializeBlock(doc: BlockDoc): Block {
  if (doc.type === "markdown") {
    return {
      type: "markdown",
      content: {
        en: doc.content?.en,
        es: doc.content?.es,
      },
    };
  }

  if (doc.type === "input") {
    return {
      type: "input",
      id: doc.id!,
      label: {
        en: doc.label?.en || "",
        es: doc.label?.es || "",
      },
      helpText: doc.helpText
        ? { en: doc.helpText.en || "", es: doc.helpText.es || "" }
        : undefined,
      required: doc.required,
      inputType: doc.inputType!,
      placeholder: doc.placeholder
        ? { en: doc.placeholder.en || "", es: doc.placeholder.es || "" }
        : undefined,
    };
  }

  // select
  return {
    type: "select",
    id: doc.id!,
    label: {
      en: doc.label?.en || "",
      es: doc.label?.es || "",
    },
    helpText: doc.helpText
      ? { en: doc.helpText.en || "", es: doc.helpText.es || "" }
      : undefined,
    required: doc.required,
    options: (doc.options || []).map(serializeSelectOption),
  };
}

export function serializeTask(doc: TaskDoc): Task {
  return {
    _id: doc._id!.toString(),
    name: {
      en: doc.name.en,
      es: doc.name.es,
    },
    icon: doc.icon,
    blocks: doc.blocks?.map(serializeBlock),
  };
}

function serializeExperimentDay(doc: ExperimentDayDoc): ExperimentDay {
  return {
    dayNumber: doc.dayNumber,
    tasks: doc.tasks.map(serializeTask),
  };
}

export function serializeExperiment(doc: ExperimentDoc): Experiment {
  return {
    _id: doc._id.toString(),
    name: {
      en: doc.name.en,
      es: doc.name.es,
    },
    description: {
      en: doc.description.en,
      es: doc.description.es,
    },
    boxId: doc.boxId.toString(),
    days: doc.days.map(serializeExperimentDay),
  };
}

export function serializeExperimentWithBox(doc: ExperimentWithBoxDoc): ExperimentWithBox {
  return {
    _id: doc._id.toString(),
    name: {
      en: doc.name.en,
      es: doc.name.es,
    },
    description: {
      en: doc.description.en,
      es: doc.description.es,
    },
    boxId: serializeBox(doc.boxId),
    days: doc.days.map(serializeExperimentDay),
  };
}

// ============ Helpers ============

// Helper to populate box in experiment
async function populateExperimentWithBox(experiment: ExperimentDoc): Promise<ExperimentWithBoxDoc | null> {
  const boxes = await getBoxes();
  const box = await boxes.findOne({ _id: experiment.boxId });
  if (!box) return null;

  return {
    ...experiment,
    boxId: box,
  };
}

// ============ RPC Functions ============

export const listExperimentsByBox = createServerFn({ method: "POST" })
  .inputValidator((data: string) => data)
  .handler(async ({ data: boxId }): Promise<Experiment[]> => {
    const experiments = await getExperiments();
    const docs = await experiments.find({ boxId: new ObjectId(boxId) }).toArray();
    return docs.map(serializeExperiment);
  });

export const getExperiment = createServerFn({ method: "POST" })
  .inputValidator((data: string) => data)
  .handler(async ({ data: experimentId }): Promise<Experiment> => {
    const experiments = await getExperiments();
    const experiment = await experiments.findOne({ _id: new ObjectId(experimentId) });
    if (!experiment) {
      throw new Error("Experiment not found");
    }
    return serializeExperiment(experiment);
  });

export const listAllExperiments = createServerFn({ method: "GET" }).handler(
  async (): Promise<Experiment[]> => {
    const experiments = await getExperiments();
    const docs = await experiments.find().toArray();
    return docs.map(serializeExperiment);
  },
);

export { populateExperimentWithBox };
