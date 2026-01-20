import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createBox,
  deleteBox,
  listAllBoxes,
  publishBox,
  unpublishBox,
  updateBox,
} from "@/server/rpc/boxes";
import type { LocalizedText } from "@/types/shared";

export const allBoxesQuery = () =>
  queryOptions({
    queryKey: ["boxes", "list"],
    queryFn: () => listAllBoxes(),
  });

export const useCreateBoxMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: LocalizedText;
      description: LocalizedText;
      icon: string;
      thumbnail: string;
    }) => createBox({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boxes", "list"] });
    },
  });
};

export const useUpdateBoxMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id: string;
      name: LocalizedText;
      description: LocalizedText;
      icon: string;
      thumbnail: string;
    }) => updateBox({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["boxes", "list"] });
      queryClient.invalidateQueries({
        queryKey: ["boxes", "detail", variables.id],
      });
    },
  });
};

export const usePublishBoxMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (boxId: string) => publishBox({ data: boxId }),
    onSuccess: (_, boxId) => {
      queryClient.invalidateQueries({ queryKey: ["boxes", "list"] });
      queryClient.invalidateQueries({ queryKey: ["boxes", "detail", boxId] });
    },
  });
};

export const useUnpublishBoxMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (boxId: string) => unpublishBox({ data: boxId }),
    onSuccess: (_, boxId) => {
      queryClient.invalidateQueries({ queryKey: ["boxes", "list"] });
      queryClient.invalidateQueries({ queryKey: ["boxes", "detail", boxId] });
    },
  });
};

export const useDeleteBoxMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (boxId: string) => deleteBox({ data: boxId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boxes", "list"] });
    },
  });
};
