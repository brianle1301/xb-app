import React from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronRight, Play, Undo2 } from "lucide-react";

import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth-context";
import { getLocalized, useLanguage } from "@/lib/language-context";
import { getBox } from "@/server/rpc/boxes";
import {
  completeTask,
  getTodayCompletions,
  uncompleteTask,
} from "@/server/rpc/completions";
import { listExperimentsByBox } from "@/server/rpc/experiments";
import {
  getUserSubscriptions,
  startSubscription,
} from "@/server/rpc/subscriptions";

export const Route = createFileRoute("/_app/boxes/$boxId/experiments")({
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
  const { user } = useAuth();
  const userId = user!.id;
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = React.useState<any | null>(null);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = React.useState<
    string | null
  >(null);
  const [selectedDayNumber, setSelectedDayNumber] = React.useState<number | null>(
    null,
  );
  const [expandedExperimentId, setExpandedExperimentId] = React.useState<
    string | null
  >(null);

  const { data: box } = useSuspenseQuery({
    queryKey: ["box", boxId],
    queryFn: () => getBox({ data: boxId }),
  });

  const { data: experiments } = useSuspenseQuery({
    queryKey: ["experiments", boxId],
    queryFn: () => listExperimentsByBox({ data: boxId }),
  });

  const { data: subscriptions } = useSuspenseQuery({
    queryKey: ["subscriptions", userId],
    queryFn: () => getUserSubscriptions({ data: userId }),
  });

  const { data: completions } = useSuspenseQuery({
    queryKey: ["completions", userId],
    queryFn: () => getTodayCompletions({ data: userId }),
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

  // Create a map for quick lookup
  const subscriptionMap = new Map<string, (typeof subscriptions)[number]>();
  subscriptions?.forEach((sub) => {
    if (sub && sub.experimentId) {
      const experimentId =
        typeof sub.experimentId === "object"
          ? (sub.experimentId as any)._id
          : sub.experimentId;
      if (experimentId) {
        subscriptionMap.set(experimentId, sub);
      }
    }
  });

  const startMutation = useMutation({
    mutationFn: (subscriptionId: string) =>
      startSubscription({ data: { subscriptionId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["today-tasks"] });
    },
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

  // Find completion status for selected task in drawer
  const selectedTaskCompleted =
    selectedTask &&
    selectedSubscriptionId &&
    selectedDayNumber !== null &&
    isTaskCompleted(selectedSubscriptionId, selectedTask._id, selectedDayNumber);

  return (
    <div className="container max-w-screen-sm mx-auto px-4 py-6">
      <Link
        to="/experiments"
        className="flex items-center gap-2 text-primary mb-4 hover:underline"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        Back to boxes
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <span className="text-5xl">{box?.thumbnail}</span>
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
        {experiments?.map((experiment) => {
          const experimentId = experiment._id;
          const subscription = subscriptionMap.get(experimentId);
          const isExpanded = expandedExperimentId === experimentId;
          const dayCount = experiment.days?.length ?? 0;
          const firstDayTasks = experiment.days?.[0]?.tasks ?? [];

          const status = subscription?.status;
          const currentDay = subscription?.currentDay;

          return (
            <Collapsible
              key={experimentId}
              open={isExpanded}
              onOpenChange={(open) =>
                setExpandedExperimentId(open ? experimentId : null)
              }
            >
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">
                          {getLocalized(experiment.name, language)}
                        </h3>
                        {status === "started" && currentDay && (
                          <Badge variant="default">
                            Day {currentDay}/{dayCount}
                          </Badge>
                        )}
                        {status === "offered" && (
                          <Badge variant="secondary">New</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {dayCount} {dayCount === 1 ? "day" : "days"}
                      </p>
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 text-muted-foreground transition-transform ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground mb-4">
                      {getLocalized(experiment.description, language)}
                    </p>

                    {status === "offered" && subscription && (
                      <Button
                        className="w-full mb-4"
                        onClick={(e) => {
                          e.stopPropagation();
                          startMutation.mutate(subscription._id);
                        }}
                        disabled={startMutation.isPending}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {startMutation.isPending
                          ? "Starting..."
                          : "Start Experiment"}
                      </Button>
                    )}

                    {status === "started" && currentDay && subscription && (
                      <>
                        <p className="text-xs text-muted-foreground mb-2">
                          Today's Tasks:
                        </p>
                        <div className="space-y-2">
                          {(
                            experiment.days?.[currentDay - 1]?.tasks ?? []
                          ).map((task: any) => {
                            const completed = isTaskCompleted(
                              subscription._id,
                              task._id,
                              currentDay,
                            );
                            return (
                              <button
                                key={task._id}
                                onClick={() => {
                                  setSelectedTask(task);
                                  setSelectedSubscriptionId(subscription._id);
                                  setSelectedDayNumber(currentDay);
                                }}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                                  completed ? "bg-muted/50" : "hover:bg-muted"
                                }`}
                              >
                                {completed ? (
                                  <Check className="w-6 h-6 text-green-500 flex-shrink-0" />
                                ) : (
                                  <span className="text-2xl flex-shrink-0">
                                    {task.icon}
                                  </span>
                                )}
                                <span
                                  className={`flex-1 font-medium ${completed ? "line-through text-muted-foreground" : ""}`}
                                >
                                  {getLocalized(task.name, language)}
                                </span>
                                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {status !== "started" && (
                      <>
                        <p className="text-xs text-muted-foreground mb-2">
                          Day 1 Preview:
                        </p>
                        <div className="space-y-2">
                          {firstDayTasks.map((task: any) => (
                            <button
                              key={task._id}
                              onClick={() => {
                                setSelectedTask(task);
                                setSelectedSubscriptionId(null);
                                setSelectedDayNumber(null);
                              }}
                              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{task.icon}</span>
                                <span className="font-medium">
                                  {getLocalized(task.name, language)}
                                </span>
                              </div>
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
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
        <DrawerContent className="max-h-[85vh]">
          {selectedTask && (
            <>
              <DrawerHeader>
                <DrawerTitle className="flex items-center gap-2">
                  {selectedTaskCompleted ? (
                    <Check className="w-6 h-6 text-green-500" />
                  ) : (
                    <span className="text-2xl">{selectedTask.icon}</span>
                  )}
                  <span
                    className={
                      selectedTaskCompleted
                        ? "line-through text-muted-foreground"
                        : ""
                    }
                  >
                    {getLocalized(selectedTask.name, language)}
                  </span>
                </DrawerTitle>
              </DrawerHeader>
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                {selectedTask.blocks?.map((block: any, index: number) => (
                  <MarkdownRenderer
                    key={index}
                    content={getLocalized(block.content, language)}
                  />
                ))}
              </div>
              <div className="p-4 border-t bg-background flex gap-2">
                {selectedSubscriptionId && selectedDayNumber !== null && (
                  <Button
                    variant={selectedTaskCompleted ? "outline" : "default"}
                    className="flex-1"
                    onClick={() => {
                      const data = {
                        userId,
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
                        <Undo2 className="w-4 h-4 mr-2" />
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
                  <Button
                    variant={selectedSubscriptionId ? "outline" : "default"}
                    className="flex-1"
                  >
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
