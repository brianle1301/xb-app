import React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { ExperimentCard } from "@/components/experiment-card";
import { Spinner } from "@/components/ui/spinner";
import { getLocalized, useLanguage } from "@/lib/language-context";
import { boxDetailQuery } from "@/queries/boxes";
import {
  useCompleteTaskMutation,
  userSubscriptionsQuery,
  useStartSubscriptionMutation,
  useUncompleteTaskMutation,
} from "@/queries/subscriptions";

export const Route = createFileRoute("/_app/boxes/$boxId/experiments")({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(boxDetailQuery(params.boxId)),
      context.queryClient.ensureQueryData(userSubscriptionsQuery()),
    ]);
  },
  component: BoxExperimentsPage,
  pendingComponent: () => (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner />
    </div>
  ),
});

function BoxExperimentsPage() {
  const { boxId } = Route.useParams();
  const { language } = useLanguage();
  const [expandedExperimentId, setExpandedExperimentId] = React.useState<
    string | null
  >(null);

  const { data: box } = useSuspenseQuery(boxDetailQuery(boxId));
  const { data: allSubscriptions } = useSuspenseQuery(userSubscriptionsQuery());

  // Filter subscriptions to only those for this box
  const subscriptions = allSubscriptions?.filter(
    (sub) => sub.experimentId?.boxId === boxId,
  );

  const startMutation = useStartSubscriptionMutation();
  const completeMutation = useCompleteTaskMutation();
  const uncompleteMutation = useUncompleteTaskMutation();

  return (
    <div className="pt-6">
      <div className="flex items-center gap-4 mb-6">
        <img
          src={box.thumbnail}
          alt={getLocalized(box.name, language)}
          className="w-16 h-16 rounded-lg object-cover"
        />
        <div>
          <h1 className="text-2xl font-bold">
            {box && getLocalized(box.name, language)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {box && getLocalized(box.description, language)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {subscriptions?.map((subscription) => {
          const experiment = subscription.experimentId;
          if (!experiment) return null;

          // Build completed keys set from this subscription's completions
          const completedTaskKeys = new Set(
            subscription.completions?.map(
              (c) => `${c.taskId}-${c.dayNumber}`,
            ) ?? [],
          );

          return (
            <ExperimentCard
              key={experiment.id}
              experiment={experiment}
              language={language}
              expanded={expandedExperimentId === experiment.id}
              onExpandedChange={(expanded) =>
                setExpandedExperimentId(expanded ? experiment.id : null)
              }
              subscription={{
                id: subscription.id,
                status: subscription.status,
                currentDay: subscription.currentDay,
              }}
              isTaskCompleted={(taskId, dayNumber) =>
                completedTaskKeys.has(`${taskId}-${dayNumber}`)
              }
              onStart={() => startMutation.mutate(subscription.id)}
              onCompleteTask={(taskId, dayNumber, responses) =>
                completeMutation.mutate({
                  data: {
                    subscriptionId: subscription.id,
                    taskId,
                    dayNumber,
                    responses,
                  },
                })
              }
              onUncompleteTask={(taskId, dayNumber) =>
                uncompleteMutation.mutate({
                  data: {
                    subscriptionId: subscription.id,
                    taskId,
                    dayNumber,
                  },
                })
              }
              isStartPending={startMutation.isPending}
              isCompletePending={completeMutation.isPending}
              isUncompletePending={uncompleteMutation.isPending}
            />
          );
        })}
      </div>
    </div>
  );
}
