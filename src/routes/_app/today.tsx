import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FlaskConical } from "lucide-react";

import { TaskList } from "@/components/experiment-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardHeaderText,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { getLocalized, useLanguage } from "@/lib/language-context";
import {
  todayTasksQuery,
  useCompleteTaskMutation,
  useSubmitTaskResponseMutation,
} from "@/queries/subscriptions";

export const Route = createFileRoute("/_app/today")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(todayTasksQuery());
  },
  component: TodayPage,
  pendingComponent: () => (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner />
    </div>
  ),
});

function TodayPage() {
  const { language } = useLanguage();

  const { data: todayData } = useSuspenseQuery(todayTasksQuery());

  const completeMutation = useCompleteTaskMutation();
  const submitResponseMutation = useSubmitTaskResponseMutation();

  const filteredTodayData = todayData?.filter((group) => group !== null) || [];

  return (
    <div className="w-full max-w-screen-sm mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Today</h1>

      {filteredTodayData.length === 0 && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FlaskConical className="size-5" />
              </EmptyMedia>
              <EmptyTitle>No experiments for today</EmptyTitle>
            </EmptyHeader>
            <Button asChild>
              <Link to="/experiments">Browse Experiments</Link>
            </Button>
          </Empty>
        </div>
      )}

      <div className="space-y-6">
        {filteredTodayData.map((group) => {
          const { subscription, experiment, tasks, currentDay, totalDays } =
            group;
          const subscriptionId = subscription.id;

          // Build completed keys set from this subscription's completions
          const completedTaskKeys = new Set(
            subscription.completions?.map(
              (c) => `${c.taskId}-${c.dayNumber}`
            ) ?? []
          );

          const isTaskCompleted = (taskId: string, dayNumber: number) =>
            completedTaskKeys.has(`${taskId}-${dayNumber}`);

          // Count completed tasks for this subscription/day
          const completedCount = tasks.filter((task) =>
            isTaskCompleted(task.id, currentDay)
          ).length;

          return (
            <Card key={experiment.id}>
              <CardHeader>
                <CardHeaderText>
                  <CardTitle>
                    {getLocalized(experiment.name, language)}
                  </CardTitle>
                  <CardDescription>
                    Day {currentDay} of {totalDays} ({completedCount}/
                    {tasks.length})
                  </CardDescription>
                </CardHeaderText>
              </CardHeader>
              <CardContent>
                <TaskList
                  tasks={tasks}
                  language={language}
                  dayNumber={currentDay}
                  isTaskCompleted={(taskId) =>
                    isTaskCompleted(taskId, currentDay)
                  }
                  onCompleteTask={(taskId) =>
                    completeMutation.mutate({
                      data: {
                        subscriptionId,
                        taskId,
                        dayNumber: currentDay,
                      },
                    })
                  }
                  onSubmitResponse={(taskId, responses) =>
                    submitResponseMutation.mutate({
                      data: {
                        subscriptionId,
                        taskId,
                        dayNumber: currentDay,
                        responses,
                      },
                    })
                  }
                  isCompletePending={completeMutation.isPending}
                  isSubmitPending={submitResponseMutation.isPending}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
