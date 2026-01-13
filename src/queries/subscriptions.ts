import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  abandonSubscription,
  completeTask,
  getTodayTasksForUser,
  getUserSubscriptions,
  offerExperimentToUser,
  startSubscription,
  uncompleteTask,
} from "@/server/rpc/subscriptions";

export const userSubscriptionsQuery = () =>
  queryOptions({
    queryKey: ["subscriptions", "list"],
    queryFn: () => getUserSubscriptions(),
  });

export const todayTasksQuery = () =>
  queryOptions({
    queryKey: ["subscriptions", "todayTasks"],
    queryFn: () => getTodayTasksForUser(),
  });

export const useStartSubscriptionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subscriptionId: string) =>
      startSubscription({ data: { subscriptionId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
  });
};

export const useAbandonSubscriptionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subscriptionId: string) =>
      abandonSubscription({ data: { subscriptionId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
  });
};

export const useOfferExperimentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (experimentId: string) =>
      offerExperimentToUser({ data: { experimentId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
  });
};

export const useCompleteTaskMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: completeTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
  });
};

export const useUncompleteTaskMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uncompleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
  });
};
