import React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import { Plus, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable, DataTableColumnHeader } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardHeaderText,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { allExperimentsQuery } from "@/queries/admin/experiments";
import {
  useAdminRemoveSubscriptionMutation,
  useAdminSubscribeUserMutation,
  userDetailQuery,
  userSubscriptionsQuery,
  useSetUserRoleMutation,
} from "@/queries/admin/users";
import type { SubscriptionWithExperiment } from "@/server/rpc/subscriptions";

export const Route = createFileRoute("/admin/users/$userId")({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(userDetailQuery(params.userId)),
      context.queryClient.ensureQueryData(
        userSubscriptionsQuery(params.userId),
      ),
      context.queryClient.ensureQueryData(allExperimentsQuery()),
    ]);
  },
  component: UserDetailPage,
});

const ch = createColumnHelper<SubscriptionWithExperiment>();

function UserDetailPage() {
  const { userId } = Route.useParams();
  const { user: currentUser } = Route.useRouteContext();
  const { data: user } = useSuspenseQuery(userDetailQuery(userId));
  const { data: subscriptions } = useSuspenseQuery(
    userSubscriptionsQuery(userId),
  );
  const { data: experiments } = useSuspenseQuery(allExperimentsQuery());

  const setRoleMutation = useSetUserRoleMutation();
  const subscribeMutation = useAdminSubscribeUserMutation();
  const removeSubscriptionMutation = useAdminRemoveSubscriptionMutation();

  const isOwnUser = currentUser.id === user.id;
  const isAdmin = user.role === "admin";

  // Get active subscription experiment IDs
  const activeSubscriptionExperimentIds = new Set(
    subscriptions
      .filter((s) => s.status === "offered" || s.status === "started")
      .map((s) => s.experimentId.id),
  );

  // Get published experiments that user is not subscribed to
  const availableExperiments = experiments.filter(
    (e) =>
      e.status === "published" && !activeSubscriptionExperimentIds.has(e.id),
  );

  const handleMakeAdmin = () => {
    setRoleMutation.mutate(
      { userId: user.id, role: "admin" },
      {
        onSuccess: () => toast.success("User is now an admin"),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const handleRevokeAdmin = () => {
    setRoleMutation.mutate(
      { userId: user.id, role: "user" },
      {
        onSuccess: () => toast.success("Admin access revoked"),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const handleSubscribe = (experimentId: string) => {
    subscribeMutation.mutate(
      { userId: user.id, experimentId },
      {
        onSuccess: () => toast.success("User subscribed to experiment"),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const handleRemoveSubscription = React.useCallback(
    (subscriptionId: string) => {
      removeSubscriptionMutation.mutate(
        { subscriptionId, userId: user.id },
        {
          onSuccess: () => toast.success("Subscription removed"),
          onError: (error) => toast.error(error.message),
        },
      );
    },
    [removeSubscriptionMutation, user.id],
  );

  const columns = React.useMemo(
    () => [
      ch.accessor((row) => row.experimentId.name.en, {
        id: "experiment",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Experiment" />
        ),
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      ch.accessor("status", {
        header: "Status",
        cell: (info) => {
          const status = info.getValue();
          return (
            <Badge
              variant={
                status === "started"
                  ? "default"
                  : status === "completed"
                    ? "secondary"
                    : status === "abandoned"
                      ? "destructive"
                      : "outline"
              }
            >
              {status}
            </Badge>
          );
        },
      }),
      ch.accessor(
        (row) => {
          const totalTasks = row.experimentId.days.reduce(
            (sum, day) => sum + day.tasks.length,
            0,
          );
          return totalTasks > 0 ? row.completions.length / totalTasks : 0;
        },
        {
          id: "completion",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Completion" />
          ),
          cell: ({ row }) => {
            const totalTasks = row.original.experimentId.days.reduce(
              (sum, day) => sum + day.tasks.length,
              0,
            );
            return (
              <span className="text-muted-foreground">
                {row.original.completions.length}/{totalTasks} tasks
              </span>
            );
          },
        },
      ),
      ch.accessor("createdAt", {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Subscribed" />
        ),
        cell: (info) => new Date(info.getValue()).toLocaleDateString(),
      }),
      ch.display({
        id: "actions",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleRemoveSubscription(row.original.id)}
            disabled={removeSubscriptionMutation.isPending}
          >
            <Trash2 className="size-4" />
          </Button>
        ),
      }),
    ],
    [handleRemoveSubscription, removeSubscriptionMutation.isPending],
  );

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">User Details</h1>

      <Card>
        <CardHeader>
          <CardHeaderText>
            <CardTitle className="flex items-center gap-2">
              {user.name}
            </CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </CardHeaderText>
          <CardAction className="flex gap-2">
            {isOwnUser && (
              <Badge variant="secondary" className="text-xs">
                You
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground text-xs">User ID</dt>
              <dd>{user.id}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground text-xs">Role</dt>
              <dd>{isAdmin ? "Admin" : "User"}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground text-xs">Created</dt>
              <dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        </CardContent>
        {!isOwnUser && (
          <CardFooter>
            {isAdmin ? (
              <Button
                variant="outline"
                onClick={handleRevokeAdmin}
                disabled={setRoleMutation.isPending}
              >
                <ShieldOff className="size-4" />
                {setRoleMutation.isPending
                  ? "Revoking..."
                  : "Revoke Admin Access"}
              </Button>
            ) : (
              <Button
                onClick={handleMakeAdmin}
                disabled={setRoleMutation.isPending}
              >
                <ShieldCheck className="size-4" />
                {setRoleMutation.isPending ? "Granting..." : "Make Admin"}
              </Button>
            )}
          </CardFooter>
        )}
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Subscriptions</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={availableExperiments.length === 0}
              >
                <Plus className="size-4" />
                Add Subscription
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {availableExperiments.map((experiment) => (
                <DropdownMenuItem
                  key={experiment.id}
                  onClick={() => handleSubscribe(experiment.id)}
                >
                  {experiment.name.en}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <DataTable columns={columns} data={subscriptions} />
      </section>
    </div>
  );
}
