import React from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronRight, FlaskConical, Undo2 } from "lucide-react";

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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { getLocalized, useLanguage } from "@/lib/language-context";
import {
  completeTask,
  getTodayCompletions,
  uncompleteTask,
} from "@/server/rpc/completions";
import { getTodayTasksForUser } from "@/server/rpc/subscriptions";
import type { Block, Task } from "@/types/shared";

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
  const { user } = useAuth();
  const userId = user!.id;
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = React.useState<
    string | null
  >(null);
  const [selectedDayNumber, setSelectedDayNumber] = React.useState<number | null>(
    null,
  );
  const [formResponses, setFormResponses] = React.useState<Record<string, string>>(
    {},
  );

  const { data: todayData } = useSuspenseQuery({
    queryKey: ["today-tasks", userId],
    queryFn: () => getTodayTasksForUser({ data: userId }),
  });

  const { data: completions } = useSuspenseQuery({
    queryKey: ["completions", userId],
    queryFn: () => getTodayCompletions({ data: userId }),
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
        <div className="flex items-center justify-center min-h-[60vh]">
          <Empty>
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
        </div>
      )}

      <div className="space-y-6">
        {filteredTodayData.map((group) => {
          const { subscription, experiment, tasks, currentDay, totalDays } =
            group;
          const box = experiment.boxId;
          const subscriptionId = subscription._id;

          // Count completed tasks for this subscription/day
          const completedCount = tasks.filter((task) =>
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
                  {tasks.map((task) => {
                    const completed = isTaskCompleted(
                      subscriptionId,
                      task._id,
                      currentDay,
                    );

                    return (
                      <button
                        key={task._id}
                        onClick={() => {
                          setSelectedTask(task);
                          setSelectedSubscriptionId(subscriptionId);
                          setSelectedDayNumber(currentDay);
                          setFormResponses({});
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
                <FieldGroup>
                  {selectedTask.blocks?.map((block: Block, index: number) => {
                    if (block.type === "markdown") {
                      return (
                        <MarkdownRenderer
                          key={index}
                          content={getLocalized(block.content, language)}
                        />
                      );
                    }

                    if (block.type === "input") {
                      const isTextarea = block.inputType === "textarea";
                      return (
                        <Field key={index}>
                          <FieldLabel>
                            {getLocalized(block.label, language)}
                            {block.required && (
                              <span className="text-destructive ml-1">*</span>
                            )}
                          </FieldLabel>
                          {isTextarea ? (
                            <Textarea
                              value={formResponses[block.id] || ""}
                              onChange={(e) =>
                                setFormResponses((prev) => ({
                                  ...prev,
                                  [block.id]: e.target.value,
                                }))
                              }
                              placeholder={
                                block.placeholder
                                  ? getLocalized(block.placeholder, language)
                                  : undefined
                              }
                              disabled={!!selectedTaskCompleted}
                            />
                          ) : (
                            <Input
                              type={block.inputType || "text"}
                              value={formResponses[block.id] || ""}
                              onChange={(e) =>
                                setFormResponses((prev) => ({
                                  ...prev,
                                  [block.id]: e.target.value,
                                }))
                              }
                              placeholder={
                                block.placeholder
                                  ? getLocalized(block.placeholder, language)
                                  : undefined
                              }
                              disabled={!!selectedTaskCompleted}
                            />
                          )}
                          {block.helpText && (
                            <FieldDescription>
                              {getLocalized(block.helpText, language)}
                            </FieldDescription>
                          )}
                        </Field>
                      );
                    }

                    if (block.type === "select") {
                      return (
                        <Field key={index}>
                          <FieldLabel>
                            {getLocalized(block.label, language)}
                            {block.required && (
                              <span className="text-destructive ml-1">*</span>
                            )}
                          </FieldLabel>
                          <Select
                            value={formResponses[block.id] || ""}
                            onValueChange={(value) =>
                              setFormResponses((prev) => ({
                                ...prev,
                                [block.id]: value,
                              }))
                            }
                            disabled={!!selectedTaskCompleted}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue
                                placeholder={
                                  language === "es"
                                    ? "Selecciona una opción"
                                    : "Select an option"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {block.options.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {getLocalized(option.label, language)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {block.helpText && (
                            <FieldDescription>
                              {getLocalized(block.helpText, language)}
                            </FieldDescription>
                          )}
                        </Field>
                      );
                    }

                    return null;
                  })}
                </FieldGroup>
              </div>
              <div className="p-4 border-t bg-background flex gap-2">
                {selectedSubscriptionId && selectedDayNumber !== null && (
                  <Button
                    variant={selectedTaskCompleted ? "outline" : "default"}
                    className="flex-1"
                    onClick={() => {
                      // Check required fields
                      const requiredBlocks =
                        selectedTask.blocks?.filter(
                          (b): b is Block & { id: string; required: true } =>
                            (b.type === "input" || b.type === "select") &&
                            !!b.required,
                        ) || [];
                      const missingRequired = requiredBlocks.some(
                        (b) => !formResponses[b.id]?.trim(),
                      );
                      if (!selectedTaskCompleted && missingRequired) {
                        return; // Don't submit if required fields are empty
                      }

                      const data = {
                        userId,
                        subscriptionId: selectedSubscriptionId,
                        taskId: selectedTask._id,
                        dayNumber: selectedDayNumber,
                        responses: formResponses,
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
