import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  type BlockInput,
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
  id: string;
  title: LocalizedText;
  thumbnail: string;
  content: LocalizedText;
}

interface TaskInput {
  id: string;
  name: LocalizedText;
  icon: string;
  blocks?: BlockInput[];
}

interface DayInput {
  id: string;
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
      id: string;
      name: LocalizedText;
      boxId?: string;
      overviews?: OverviewInput[];
      days?: DayInput[];
    }) => updateExperiment({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["experiments", "list"] });
      queryClient.invalidateQueries({
        queryKey: ["experiments", "detail", variables.id],
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
