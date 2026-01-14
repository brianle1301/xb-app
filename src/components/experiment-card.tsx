import React from "react";
import { AlertCircle, Check, ChevronRight, Play, Undo2 } from "lucide-react";

import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Thumbnail } from "@/components/thumbnail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardHeaderText,
  CardHeaderTrigger,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { getLocalized } from "@/lib/language-context";
import type {
  Block,
  ExperimentDay,
  Language,
  LocalizedText,
  Overview,
  Task,
} from "@/types/shared";

// TaskList component props
export interface TaskListProps {
  tasks: Task[];
  language: Language;
  dayNumber: number | null;
  isTaskCompleted?: (taskId: string) => boolean;
  onCompleteTask?: (taskId: string, responses: Record<string, string>) => void;
  onUncompleteTask?: (taskId: string) => void;
  isCompletePending?: boolean;
  isUncompletePending?: boolean;
}

export function TaskList({
  tasks,
  language,
  dayNumber,
  isTaskCompleted,
  onCompleteTask,
  onUncompleteTask,
  isCompletePending,
  isUncompletePending,
}: TaskListProps) {
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [formResponses, setFormResponses] = React.useState<
    Record<string, string>
  >({});

  const isPreviewMode = dayNumber === null;
  const selectedTaskCompleted =
    selectedTask && isTaskCompleted?.(selectedTask._id);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setFormResponses({});
  };

  const handleCompleteClick = () => {
    if (!selectedTask) return;

    // Check required fields
    const requiredBlocks =
      selectedTask.blocks?.filter(
        (b): b is Block & { id: string; required: true } =>
          (b.type === "text" || b.type === "number" || b.type === "select") &&
          !!b.required,
      ) || [];
    const missingRequired = requiredBlocks.some(
      (b) => !formResponses[b.id]?.trim(),
    );
    if (!selectedTaskCompleted && missingRequired) {
      return;
    }

    if (selectedTaskCompleted) {
      onUncompleteTask?.(selectedTask._id);
    } else {
      onCompleteTask?.(selectedTask._id, formResponses);
    }
  };

  return (
    <>
      <div className="border rounded-lg bg-muted/50 overflow-hidden divide-y divide-border">
        {tasks.map((task) => {
          const completed = isTaskCompleted?.(task._id);
          return (
            <button
              key={task._id}
              onClick={() => handleTaskClick(task)}
              className={`w-full flex items-center gap-3 p-3 transition-colors text-left ${
                completed ? "" : "hover:bg-muted"
              }`}
            >
              {completed ? (
                <Check className="w-5 h-5 text-green-500 shrink-0" />
              ) : (
                <DynamicIcon
                  name={task.icon}
                  className="w-5 h-5 text-muted-foreground shrink-0"
                />
              )}
              <span
                className={`flex-1 font-medium ${completed ? "line-through text-muted-foreground" : ""}`}
              >
                {getLocalized(task.name, language) || (
                  <span className="text-muted-foreground">(Untitled)</span>
                )}
              </span>
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Task Drawer */}
      <Drawer
        open={!!selectedTask}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTask(null);
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
                    {getLocalized(selectedTask.name, language) || (
                      <span className="text-muted-foreground">(Untitled)</span>
                    )}
                  </span>
                </DrawerTitle>
              </DrawerHeader>

              {/* Preview mode warning */}
              {isPreviewMode && (
                <div className="mx-4 mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-500">Preview Mode</p>
                    <p className="text-muted-foreground">
                      {language === "es"
                        ? "Suscríbete al experimento para completar las tareas."
                        : "Start the experiment to complete tasks."}
                    </p>
                  </div>
                </div>
              )}

              <div className="p-4">
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

                    const isDisabled = !!selectedTaskCompleted || isPreviewMode;

                    if (block.type === "text") {
                      return (
                        <Field key={index}>
                          <FieldLabel>
                            {getLocalized(block.label, language)}
                            {block.required && (
                              <span className="text-destructive ml-1">*</span>
                            )}
                          </FieldLabel>
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
                            disabled={isDisabled}
                          />
                          {block.helpText && (
                            <FieldDescription>
                              {getLocalized(block.helpText, language)}
                            </FieldDescription>
                          )}
                        </Field>
                      );
                    }

                    if (block.type === "number") {
                      return (
                        <Field key={index}>
                          <FieldLabel>
                            {getLocalized(block.label, language)}
                            {block.required && (
                              <span className="text-destructive ml-1">*</span>
                            )}
                          </FieldLabel>
                          <Input
                            type="number"
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
                            disabled={isDisabled}
                          />
                          {block.helpText && (
                            <FieldDescription>
                              {getLocalized(block.helpText, language)}
                            </FieldDescription>
                          )}
                        </Field>
                      );
                    }

                    if (block.type === "select") {
                      // For multiple select, store as comma-separated values
                      const selectedValues = formResponses[block.id]
                        ? formResponses[block.id].split(",").filter(Boolean)
                        : [];

                      if (block.multiple) {
                        // Render checkboxes for multiple selection
                        return (
                          <FieldSet key={index}>
                            <FieldLegend variant="label">
                              {getLocalized(block.label, language)}
                              {block.required && (
                                <span className="text-destructive ml-1">*</span>
                              )}
                            </FieldLegend>
                            {block.helpText && (
                              <FieldDescription>
                                {getLocalized(block.helpText, language)}
                              </FieldDescription>
                            )}
                            {block.options.map((option) => {
                              const isChecked = selectedValues.includes(
                                option.value,
                              );
                              return (
                                <Field
                                  key={option.value}
                                  orientation="horizontal"
                                >
                                  <Checkbox
                                    id={`${block.id}-${option.value}`}
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      const newValues = checked
                                        ? [...selectedValues, option.value]
                                        : selectedValues.filter(
                                            (v) => v !== option.value,
                                          );
                                      setFormResponses((prev) => ({
                                        ...prev,
                                        [block.id]: newValues.join(","),
                                      }));
                                    }}
                                    disabled={isDisabled}
                                  />
                                  <FieldLabel
                                    htmlFor={`${block.id}-${option.value}`}
                                  >
                                    {getLocalized(option.label, language)}
                                  </FieldLabel>
                                </Field>
                              );
                            })}
                          </FieldSet>
                        );
                      }

                      // Render radio buttons for single selection
                      return (
                        <FieldSet key={index}>
                          <FieldLegend variant="label">
                            {getLocalized(block.label, language)}
                            {block.required && (
                              <span className="text-destructive ml-1">*</span>
                            )}
                          </FieldLegend>
                          {block.helpText && (
                            <FieldDescription>
                              {getLocalized(block.helpText, language)}
                            </FieldDescription>
                          )}
                          <RadioGroup
                            value={formResponses[block.id] || ""}
                            onValueChange={(value) =>
                              setFormResponses((prev) => ({
                                ...prev,
                                [block.id]: value,
                              }))
                            }
                            disabled={isDisabled}
                          >
                            {block.options.map((option) => (
                              <Field
                                key={option.value}
                                orientation="horizontal"
                              >
                                <RadioGroupItem
                                  value={option.value}
                                  id={`${block.id}-${option.value}`}
                                />
                                <FieldLabel
                                  htmlFor={`${block.id}-${option.value}`}
                                >
                                  {getLocalized(option.label, language)}
                                </FieldLabel>
                              </Field>
                            ))}
                          </RadioGroup>
                        </FieldSet>
                      );
                    }

                    return null;
                  })}
                </FieldGroup>
              </div>

              <div className="p-4 border-t bg-background flex gap-2">
                {!isPreviewMode && (
                  <Button
                    variant={selectedTaskCompleted ? "outline" : "default"}
                    className="flex-1"
                    onClick={handleCompleteClick}
                    disabled={isCompletePending || isUncompletePending}
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
                    variant={!isPreviewMode ? "outline" : "default"}
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
    </>
  );
}

// Minimal experiment shape needed for the card
export interface ExperimentCardData {
  _id: string;
  name: LocalizedText;
  overviews?: Overview[];
  days: ExperimentDay[];
}

// Subscription data for live mode
export interface SubscriptionData {
  _id: string;
  status: "offered" | "started" | "completed" | "abandoned";
  currentDay?: number | null;
}

export interface ExperimentCardProps {
  experiment: ExperimentCardData;
  language: Language;
  // Controlled expand state (optional)
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  // Live mode props (all optional - omit for preview mode)
  subscription?: SubscriptionData;
  isTaskCompleted?: (taskId: string, dayNumber: number) => boolean;
  onStart?: () => void;
  onCompleteTask?: (
    taskId: string,
    dayNumber: number,
    responses: Record<string, string>,
  ) => void;
  onUncompleteTask?: (taskId: string, dayNumber: number) => void;
  isStartPending?: boolean;
  isCompletePending?: boolean;
  isUncompletePending?: boolean;
}

export function ExperimentCard({
  experiment,
  language,
  expanded: controlledExpanded,
  onExpandedChange,
  subscription,
  isTaskCompleted,
  onStart,
  onCompleteTask,
  onUncompleteTask,
  isStartPending,
  isCompletePending,
  isUncompletePending,
}: ExperimentCardProps) {
  // Internal expanded state (used if not controlled)
  const [internalExpanded, setInternalExpanded] = React.useState(false);
  const expanded = controlledExpanded ?? internalExpanded;
  const setExpanded = onExpandedChange ?? setInternalExpanded;

  // Drawer state for overview
  const [selectedOverview, setSelectedOverview] =
    React.useState<Overview | null>(null);

  const dayCount = experiment.days?.length ?? 0;
  const firstDayTasks = experiment.days?.[0]?.tasks ?? [];

  // Determine mode
  const isPreviewMode = !subscription;
  const status = subscription?.status;
  const currentDay = subscription?.currentDay;

  return (
    <>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <CardHeaderTrigger />
            </CollapsibleTrigger>
            <CardHeaderText>
              <CardTitle className="flex items-center gap-2">
                {getLocalized(experiment.name, language) || (
                  <span className="text-muted-foreground">(Untitled)</span>
                )}
                {status === "started" && currentDay && (
                  <Badge variant="default">
                    Day {currentDay}/{dayCount}
                  </Badge>
                )}
                {status === "offered" && <Badge variant="secondary">New</Badge>}
              </CardTitle>
              <CardDescription>
                {dayCount} {dayCount === 1 ? "day" : "days"}
              </CardDescription>
            </CardHeaderText>
            <CardAction>
              <ChevronRight
                className={`w-5 h-5 text-muted-foreground transition-transform ${
                  expanded ? "rotate-90" : ""
                }`}
              />
            </CardAction>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {/* Overviews */}
              {experiment.overviews && experiment.overviews.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground mb-2">
                    {language === "es" ? "Información:" : "Learn More:"}
                  </p>
                  <div className="border rounded-lg bg-muted/50 overflow-hidden mb-5 divide-y divide-border">
                    {experiment.overviews.map((overview) => (
                      <button
                        key={overview._id}
                        onClick={() => setSelectedOverview(overview)}
                        className="w-full flex items-center justify-between p-3 hover:bg-muted transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <Thumbnail
                            src={overview.thumbnail}
                            className="size-10 rounded-md"
                          />
                          <span className="font-medium">
                            {getLocalized(overview.title, language) || (
                              <span className="text-muted-foreground">
                                (Untitled)
                              </span>
                            )}
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Start button (offered status or preview mode) */}
              {(status === "offered" || isPreviewMode) && (
                <Button
                  className="w-full mb-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStart?.();
                  }}
                  disabled={isPreviewMode || isStartPending}
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isStartPending ? "Starting..." : "Start Experiment"}
                </Button>
              )}

              {/* Today's tasks (started status) */}
              {status === "started" && currentDay && (
                <>
                  <p className="text-xs text-muted-foreground mb-2">
                    Today's Tasks:
                  </p>
                  <TaskList
                    tasks={experiment.days?.[currentDay - 1]?.tasks ?? []}
                    language={language}
                    dayNumber={currentDay}
                    isTaskCompleted={(taskId) =>
                      isTaskCompleted?.(taskId, currentDay) ?? false
                    }
                    onCompleteTask={(taskId, responses) =>
                      onCompleteTask?.(taskId, currentDay, responses)
                    }
                    onUncompleteTask={(taskId) =>
                      onUncompleteTask?.(taskId, currentDay)
                    }
                    isCompletePending={isCompletePending}
                    isUncompletePending={isUncompletePending}
                  />
                </>
              )}

              {/* Day 1 Preview (offered status or preview mode) */}
              {(status === "offered" || isPreviewMode) &&
                firstDayTasks.length > 0 && (
                  <>
                    <p className="text-xs text-muted-foreground mb-2">
                      Day 1 Preview:
                    </p>
                    <TaskList
                      tasks={firstDayTasks}
                      language={language}
                      dayNumber={null}
                    />
                  </>
                )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

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
                <div className="flex items-center gap-4">
                  <Thumbnail
                    src={selectedOverview.thumbnail}
                    className="size-10 rounded-md"
                  />
                  <DrawerTitle className="flex items-center gap-3">
                    {getLocalized(selectedOverview.title, language) || (
                      <span className="text-muted-foreground">(Untitled)</span>
                    )}
                  </DrawerTitle>
                </div>
              </DrawerHeader>
              <div className="p-4">
                {selectedOverview.blocks?.map((block, index) => (
                  <MarkdownRenderer
                    key={index}
                    content={getLocalized(block.content, language)}
                  />
                ))}
              </div>
              <div className="p-4 border-t bg-background">
                <DrawerClose asChild>
                  <Button className="w-full">Close</Button>
                </DrawerClose>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
