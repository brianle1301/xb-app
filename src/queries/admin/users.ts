import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";

import { getAllUsers, getUser, setUserRole } from "@/server/rpc/auth";
import {
  adminGetUserSubscriptions,
  adminRemoveSubscription,
  adminSubscribeUser,
} from "@/server/rpc/subscriptions";

export const allUsersQuery = () =>
  queryOptions({
    queryKey: ["users", "list", "all"],
    queryFn: () => getAllUsers(),
  });

export const userDetailQuery = (userId: string) =>
  queryOptions({
    queryKey: ["users", "detail", userId],
    queryFn: () => getUser({ data: userId }),
  });

export const useSetUserRoleMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string; role: "user" | "admin" }) =>
      setUserRole({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
      queryClient.invalidateQueries({
        queryKey: ["users", "detail", variables.userId],
      });
    },
  });
};

// User subscriptions
export const userSubscriptionsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["users", "subscriptions", userId],
    queryFn: () => adminGetUserSubscriptions({ data: userId }),
  });

export const useAdminSubscribeUserMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string; experimentId: string }) =>
      adminSubscribeUser({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["users", "subscriptions", variables.userId],
      });
    },
  });
};

export const useAdminRemoveSubscriptionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { subscriptionId: string; userId: string }) =>
      adminRemoveSubscription({ data: data.subscriptionId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["users", "subscriptions", variables.userId],
      });
    },
  });
};
