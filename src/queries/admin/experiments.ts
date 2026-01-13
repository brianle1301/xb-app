import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createExperiment,
  deleteExperiment,
  listAllExperiments,
  publishExperiment,
  unpublishExperiment,
  updateExperiment,
} from "@/server/rpc/experiments";
import type { LocalizedText } from "@/types/shared";

export const allExperimentsQuery = () =>
  queryOptions({
    queryKey: ["experiments", "list"],
    queryFn: () => listAllExperiments(),
  });

interface OverviewInput {
  _id?: string;
  title: LocalizedText;
  thumbnail: string;
  blocks?: Array<{ type: "markdown"; content: { en?: string; es?: string } }>;
}

interface SelectOptionInput {
  value: string;
  label: { en: string; es: string };
}

type BlockInput =
  | { type: "markdown"; content: { en?: string; es?: string } }
  | {
      type: "text";
      id: string;
      label: { en: string; es: string };
      helpText?: { en: string; es: string };
      placeholder?: { en: string; es: string };
      required?: boolean;
    }
  | {
      type: "number";
      id: string;
      label: { en: string; es: string };
      helpText?: { en: string; es: string };
      placeholder?: { en: string; es: string };
      required?: boolean;
    }
  | {
      type: "select";
      id: string;
      label: { en: string; es: string };
      helpText?: { en: string; es: string };
      required?: boolean;
      options: SelectOptionInput[];
    };

interface TaskInput {
  _id?: string;
  name: LocalizedText;
  icon: string;
  blocks?: BlockInput[];
}

interface DayInput {
  dayNumber: number;
  tasks: TaskInput[];
}

export const useCreateExperimentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: LocalizedText;
      boxId?: string;
      overviews?: OverviewInput[];
      days?: DayInput[];
    }) => createExperiment({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiments", "list"] });
    },
  });
};

export const useUpdateExperimentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      _id: string;
      name: LocalizedText;
      boxId?: string;
      overviews?: OverviewInput[];
      days?: DayInput[];
    }) => updateExperiment({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["experiments", "list"] });
      queryClient.invalidateQueries({
        queryKey: ["experiments", "detail", variables._id],
      });
    },
  });
};

export const usePublishExperimentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (experimentId: string) =>
      publishExperiment({ data: experimentId }),
    onSuccess: (_, experimentId) => {
      queryClient.invalidateQueries({ queryKey: ["experiments", "list"] });
      queryClient.invalidateQueries({
        queryKey: ["experiments", "detail", experimentId],
      });
    },
  });
};

export const useUnpublishExperimentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (experimentId: string) =>
      unpublishExperiment({ data: experimentId }),
    onSuccess: (_, experimentId) => {
      queryClient.invalidateQueries({ queryKey: ["experiments", "list"] });
      queryClient.invalidateQueries({
        queryKey: ["experiments", "detail", experimentId],
      });
    },
  });
};

export const useDeleteExperimentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (experimentId: string) =>
      deleteExperiment({ data: experimentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiments", "list"] });
    },
  });
};
