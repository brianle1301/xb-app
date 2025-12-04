import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronRight, Circle, FlaskConical } from "lucide-react";
import { useState } from "react";

import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { getLocalized, useLanguage } from "@/lib/language-context";
import {
  completeTask,
  getTodayCompletions,
  uncompleteTask,
} from "@/server/rpc/completions";
import { getTodayTasksForUser } from "@/server/rpc/subscriptions";

// Hardcoded for now - in a real app this would come from auth
const DEMO_USER_ID = "demo-user";

export const Route = createFileRoute("/_app/today")({
  component: TodayPage,
  pendingComponent: () => (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner />
    </div>
  ),
});

function TodayPage() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<
    string | null
  >(null);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(
    null,
  );

  const { data: todayData } = useSuspenseQuery({
    queryKey: ["today-tasks", DEMO_USER_ID],
    queryFn: () => getTodayTasksForUser({ data: DEMO_USER_ID }),
  });

  const { data: completions } = useSuspenseQuery({
    queryKey: ["completions", DEMO_USER_ID],
    queryFn: () => getTodayCompletions({ data: DEMO_USER_ID }),
  });

  const completeMutation = useMutation({
    mutationFn: completeTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["completions"] });
    },
  });

  const uncompleteMutation = useMutation({
    mutationFn: uncompleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["completions"] });
    },
  });

  // Build a Set of completed task keys for quick lookup
  const completedTaskKeys = new Set(
    completions?.map(
      (c) => `${c.subscriptionId}-${c.taskId}-${c.dayNumber}`,
    ) ?? [],
  );

  const isTaskCompleted = (
    subscriptionId: string,
    taskId: string,
    dayNumber: number,
  ) => completedTaskKeys.has(`${subscriptionId}-${taskId}-${dayNumber}`);

  const handleToggleComplete = (
    e: React.MouseEvent,
    subscriptionId: string,
    taskId: string,
    dayNumber: number,
  ) => {
    e.stopPropagation();
    const data = {
      userId: DEMO_USER_ID,
      subscriptionId,
      taskId,
      dayNumber,
    };

    if (isTaskCompleted(subscriptionId, taskId, dayNumber)) {
      uncompleteMutation.mutate({ data });
    } else {
      completeMutation.mutate({ data });
    }
  };

  const filteredTodayData = todayData?.filter((group) => group !== null) || [];

  // Find completion status for selected task in drawer
  const selectedTaskCompleted =
    selectedTask &&
    selectedSubscriptionId &&
    selectedDayNumber !== null &&
    isTaskCompleted(selectedSubscriptionId, selectedTask._id, selectedDayNumber);

  return (
    <div className="container max-w-screen-sm mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Today</h1>

      {filteredTodayData.length === 0 && (
        <Empty className="mt-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FlaskConical className="size-5" />
            </EmptyMedia>
            <EmptyTitle>No tasks for today</EmptyTitle>
            <EmptyDescription>
              Start an experiment to see your daily tasks here.
            </EmptyDescription>
          </EmptyHeader>
          <Button asChild>
            <Link to="/experiments">Browse Experiments</Link>
          </Button>
        </Empty>
      )}

      <div className="space-y-6">
        {filteredTodayData.map((group) => {
          const { subscription, experiment, tasks, currentDay, totalDays } =
            group;
          const box = experiment.boxId as any;
          const subscriptionId = subscription._id;

          // Count completed tasks for this subscription/day
          const completedCount = tasks.filter((task: any) =>
            isTaskCompleted(subscriptionId, task._id, currentDay),
          ).length;

          return (
            <Card key={experiment._id}>
              <CardHeader>
                <CardTitle className="text-xl">
                  {getLocalized(experiment.name, language)}
                </CardTitle>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{getLocalized(box.name, language)}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      Day {currentDay} of {totalDays}
                    </span>
                    <span className="text-xs">
                      ({completedCount}/{tasks.length})
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tasks.map((task: any) => {
                    const completed = isTaskCompleted(
                      subscriptionId,
                      task._id,
                      currentDay,
                    );

                    return (
                      <div
                        key={task._id}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          completed ? "bg-muted/50" : "hover:bg-muted"
                        }`}
                      >
                        <button
                          onClick={(e) =>
                            handleToggleComplete(
                              e,
                              subscriptionId,
                              task._id,
                              currentDay,
                            )
                          }
                          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            completed
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/30 hover:border-primary"
                          }`}
                          disabled={
                            completeMutation.isPending ||
                            uncompleteMutation.isPending
                          }
                        >
                          {completed ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Circle className="w-4 h-4 opacity-0" />
                          )}
                        </button>

                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setSelectedSubscriptionId(subscriptionId);
                            setSelectedDayNumber(currentDay);
                          }}
                          className={`flex-1 flex items-center justify-between text-left ${
                            completed ? "opacity-60" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{task.icon}</span>
                            <span
                              className={`font-medium ${completed ? "line-through" : ""}`}
                            >
                              {getLocalized(task.name, language)}
                            </span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Drawer
        open={!!selectedTask}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTask(null);
            setSelectedSubscriptionId(null);
            setSelectedDayNumber(null);
          }
        }}
      >
        <DrawerContent className="max-h-[85vh] overflow-y-auto">
          {selectedTask && (
            <>
              <DrawerHeader>
                <DrawerTitle className="flex items-center gap-2">
                  <span className="text-2xl">{selectedTask.icon}</span>
                  <span
                    className={selectedTaskCompleted ? "line-through" : ""}
                  >
                    {getLocalized(selectedTask.name, language)}
                  </span>
                  {selectedTaskCompleted && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-8">
                {selectedTask.blocks?.map((block: any, index: number) => (
                  <MarkdownRenderer
                    key={index}
                    content={getLocalized(block.content, language)}
                  />
                ))}
              </div>
              <div className="sticky bottom-0 p-4 border-t bg-background flex gap-2">
                {selectedSubscriptionId && selectedDayNumber !== null && (
                  <Button
                    variant={selectedTaskCompleted ? "outline" : "default"}
                    className="flex-1"
                    onClick={() => {
                      const data = {
                        userId: DEMO_USER_ID,
                        subscriptionId: selectedSubscriptionId,
                        taskId: selectedTask._id,
                        dayNumber: selectedDayNumber,
                      };
                      if (selectedTaskCompleted) {
                        uncompleteMutation.mutate({ data });
                      } else {
                        completeMutation.mutate({ data });
                      }
                    }}
                    disabled={
                      completeMutation.isPending || uncompleteMutation.isPending
                    }
                  >
                    {selectedTaskCompleted ? (
                      <>
                        <Circle className="w-4 h-4 mr-2" />
                        Mark Incomplete
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Mark Complete
                      </>
                    )}
                  </Button>
                )}
                <DrawerClose asChild>
                  <Button variant="outline" className="flex-1">
                    Close
                  </Button>
                </DrawerClose>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
