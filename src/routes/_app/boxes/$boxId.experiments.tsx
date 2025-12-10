import React from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, Check, ChevronRight, Play, Undo2 } from "lucide-react";

import { DynamicIcon } from "@/components/ui/dynamic-icon";
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
import type { Block, Overview, Task } from "@/types/shared";

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
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [selectedOverview, setSelectedOverview] = React.useState<Overview | null>(
    null,
  );
  const [selectedSubscriptionId, setSelectedSubscriptionId] = React.useState<
    string | null
  >(null);
  const [selectedDayNumber, setSelectedDayNumber] = React.useState<number | null>(
    null,
  );
  const [expandedExperimentId, setExpandedExperimentId] = React.useState<
    string | null
  >(null);
  const [formResponses, setFormResponses] = React.useState<Record<string, string>>(
    {},
  );

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
      const experimentId = sub.experimentId._id;
      subscriptionMap.set(experimentId, sub);
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
        {experiments
          ?.filter((experiment) => subscriptionMap.has(experiment._id))
          .map((experiment) => {
            const experimentId = experiment._id;
            const subscription = subscriptionMap.get(experimentId)!;
            const isExpanded = expandedExperimentId === experimentId;
            const dayCount = experiment.days?.length ?? 0;
            const firstDayTasks = experiment.days?.[0]?.tasks ?? [];

            const status = subscription.status;
            const currentDay = subscription.currentDay;

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

                    {experiment.overviews && experiment.overviews.length > 0 && (
                      <>
                        <p className="text-xs text-muted-foreground mb-2">
                          {language === "es" ? "Información:" : "Learn More:"}
                        </p>
                        <div className="rounded-lg bg-muted/50 overflow-hidden mb-4 divide-y divide-border">
                          {experiment.overviews.map((overview) => (
                            <button
                              key={overview._id}
                              onClick={() => setSelectedOverview(overview)}
                              className="w-full flex items-center justify-between p-3 hover:bg-muted transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                <img
                                  src={overview.thumbnail}
                                  alt=""
                                  className="w-10 h-10 rounded-md object-cover"
                                />
                                <span className="font-medium">
                                  {getLocalized(overview.title, language)}
                                </span>
                              </div>
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {status === "offered" && (
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

                    {status === "started" && currentDay && (
                      <>
                        <p className="text-xs text-muted-foreground mb-2">
                          Today's Tasks:
                        </p>
                        <div className="rounded-lg bg-muted/50 overflow-hidden divide-y divide-border">
                          {(
                            experiment.days?.[currentDay - 1]?.tasks ?? []
                          ).map((task) => {
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
                                  setFormResponses({});
                                }}
                                className={`w-full flex items-center gap-3 p-3 transition-colors text-left ${
                                  completed ? "" : "hover:bg-muted"
                                }`}
                              >
                                {completed ? (
                                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                                ) : (
                                  <DynamicIcon
                                    name={task.icon}
                                    className="w-5 h-5 text-muted-foreground flex-shrink-0"
                                  />
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
                        <div className="rounded-lg bg-muted/50 overflow-hidden divide-y divide-border">
                          {firstDayTasks.map((task) => (
                            <button
                              key={task._id}
                              onClick={() => {
                                setSelectedTask(task);
                                setSelectedSubscriptionId(null);
                                setSelectedDayNumber(null);
                                setFormResponses({});
                              }}
                              className="w-full flex items-center justify-between p-3 hover:bg-muted transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                <DynamicIcon
                                  name={task.icon}
                                  className="w-5 h-5 text-muted-foreground"
                                />
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

      {/* Task Drawer */}
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
                    <DynamicIcon
                      name={selectedTask.icon}
                      className="w-6 h-6 text-muted-foreground"
                    />
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
              {!selectedSubscriptionId && (
                <div className="mx-4 mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-500">Preview Mode</p>
                    <p className="text-muted-foreground">
                      {language === "es"
                        ? "Suscríbete al experimento para completar las tareas."
                        : "Subscribe to this experiment to complete tasks."}
                    </p>
                  </div>
                </div>
              )}
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
                              disabled={
                                !!selectedTaskCompleted || !selectedSubscriptionId
                              }
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
                              disabled={
                                !!selectedTaskCompleted || !selectedSubscriptionId
                              }
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
                            disabled={
                              !!selectedTaskCompleted || !selectedSubscriptionId
                            }
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

      {/* Overview Drawer */}
      <Drawer
        open={!!selectedOverview}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOverview(null);
          }
        }}
      >
        <DrawerContent className="max-h-[85vh]">
          {selectedOverview && (
            <>
              <DrawerHeader>
                <DrawerTitle className="flex items-center gap-3">
                  <img
                    src={selectedOverview.thumbnail}
                    alt=""
                    className="w-10 h-10 rounded-md object-cover"
                  />
                  <span>{getLocalized(selectedOverview.title, language)}</span>
                </DrawerTitle>
              </DrawerHeader>
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                {selectedOverview.blocks?.map((block, index) => (
                  <MarkdownRenderer
                    key={index}
                    content={getLocalized(block.content, language)}
                  />
                ))}
              </div>
              <div className="p-4 border-t bg-background">
                <DrawerClose asChild>
                  <Button variant="default" className="w-full">
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
