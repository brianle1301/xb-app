import React from "react";
import { AlertCircle, Check, ChevronRight, Pause, Play, RotateCcw, Send } from "lucide-react";

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
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { getLocalized } from "@/lib/language-context";
import type {
  Block,
  ExperimentDay,
  InputBlock,
  Language,
  LocalizedText,
  Overview,
  Task,
} from "@/types/shared";

// ============ Helpers ============

// Format seconds into MM:SS or HH:MM:SS
function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  if (hours > 0) {
    const hh = String(hours).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

// Check if a task has any input blocks
function hasInputBlocks(task: Task): boolean {
  return (
    task.blocks?.some(
      (b) =>
        b.type === "text" ||
        b.type === "number" ||
        b.type === "select" ||
        b.type === "slider" ||
        b.type === "stopwatch",
    ) ?? false
  );
}

// ============ StopwatchInput ============

function StopwatchInput({
  blockId,
  resettable,
  duration,
  disabled,
  value,
  onChange,
}: {
  blockId: string;
  resettable: boolean;
  duration?: number;
  disabled: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const isCountdown = !!duration && duration > 0;
  const [elapsedSeconds, setElapsedSeconds] = React.useState(() =>
    value ? Number(value) : 0,
  );
  const [isRunning, setIsRunning] = React.useState(false);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Stop interval on unmount
  React.useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Auto-stop when countdown reaches zero
  React.useEffect(() => {
    if (isCountdown && isRunning && elapsedSeconds >= duration) {
      setIsRunning(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isCountdown, isRunning, elapsedSeconds, duration]);

  const start = () => {
    if (isRunning || disabled) return;
    if (isCountdown && elapsedSeconds >= duration) return;
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        onChange(String(next));
        return next;
      });
    }, 1000);
  };

  const stop = () => {
    if (!isRunning) return;
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const reset = () => {
    stop();
    setElapsedSeconds(0);
    onChange("0");
  };

  const displaySeconds = isCountdown
    ? Math.max(0, duration - elapsedSeconds)
    : elapsedSeconds;

  const isFinished = isCountdown && elapsedSeconds >= duration;

  return (
    <div className="space-y-3">
      <div className="text-3xl font-mono text-center tabular-nums">
        {formatElapsed(displaySeconds)}
      </div>
      <div className="flex gap-2 justify-center">
        {!isRunning ? (
          <Button
            type="button"
            size="sm"
            onClick={start}
            disabled={disabled || isFinished}
          >
            <Play className="w-4 h-4 mr-1" />
            Start
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={stop}
            disabled={disabled}
          >
            <Pause className="w-4 h-4 mr-1" />
            Stop
          </Button>
        )}
        {resettable && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={reset}
            disabled={disabled}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}

// ============ TaskList ============

export interface TaskListProps {
  tasks: Task[];
  language: Language;
  dayNumber: number | null;
  isTaskCompleted?: (taskId: string) => boolean;
  onCompleteTask?: (taskId: string) => void;
  onSubmitResponse?: (taskId: string, responses: Record<string, string>) => void;
  isCompletePending?: boolean;
  isSubmitPending?: boolean;
}

export function TaskList({
  tasks,
  language,
  dayNumber,
  isTaskCompleted,
  onCompleteTask,
  onSubmitResponse,
  isCompletePending,
  isSubmitPending,
}: TaskListProps) {
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [formResponses, setFormResponses] = React.useState<
    Record<string, string>
  >({});
  const [validationErrors, setValidationErrors] = React.useState<
    Record<string, string>
  >({});

  const isPreviewMode = dayNumber === null;
  const selectedTaskCompleted =
    selectedTask && isTaskCompleted?.(selectedTask.id);
  const selectedTaskHasInputs = selectedTask ? hasInputBlocks(selectedTask) : false;

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setFormResponses({});
    setValidationErrors({});
  };

  const handleSubmitResponse = () => {
    if (!selectedTask) return;

    // Validate required fields
    const errors: Record<string, string> = {};
    const requiredBlocks =
      selectedTask.blocks?.filter(
        (b): b is InputBlock =>
          (b.type === "text" ||
            b.type === "number" ||
            b.type === "select" ||
            b.type === "slider" ||
            b.type === "stopwatch") &&
          !!b.required,
      ) ?? [];

    for (const block of requiredBlocks) {
      if (!formResponses[block.id]?.trim()) {
        errors[block.id] =
          language === "es"
            ? "Este campo es obligatorio"
            : "This field is required";
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    onSubmitResponse?.(selectedTask.id, formResponses);
    setFormResponses({});
    setValidationErrors({});
  };

  const handleMarkComplete = () => {
    if (!selectedTask) return;

    if (selectedTaskHasInputs) {
      // For tasks with inputs, Mark Complete just closes the drawer
      setSelectedTask(null);
    } else {
      // For tasks without inputs, create a completion entry
      onCompleteTask?.(selectedTask.id);
      setSelectedTask(null);
    }
  };

  const handleFieldChange = (blockId: string, value: string) => {
    setFormResponses((prev) => ({ ...prev, [blockId]: value }));
    // Clear validation error when user types
    if (validationErrors[blockId]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[blockId];
        return next;
      });
    }
  };

  return (
    <>
      <div className="border rounded-lg bg-muted/50 overflow-hidden divide-y divide-border">
        {tasks.map((task) => {
          const completed = isTaskCompleted?.(task.id);
          return (
            <button
              key={task.id}
              onClick={() => handleTaskClick(task)}
              className="w-full flex items-center gap-3 p-3 transition-colors text-left hover:bg-muted"
            >
              {completed ? (
                <Check className="w-5 h-5 text-green-500 shrink-0" />
              ) : (
                <DynamicIcon
                  name={task.icon}
                  className="w-5 h-5 text-muted-foreground shrink-0"
                />
              )}
              <span className="flex-1 font-medium">
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
                  <span>
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
                        : "Click on Start the Experiment to begin logging your experiences."}
                    </p>
                  </div>
                </div>
              )}

              <div className="p-4 overflow-y-auto">
                {/* Form blocks */}
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

                    const isDisabled = isPreviewMode;

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
                              handleFieldChange(block.id, e.target.value)
                            }
                            placeholder={
                              block.placeholder
                                ? getLocalized(block.placeholder, language)
                                : undefined
                            }
                            disabled={isDisabled}
                          />
                          {validationErrors[block.id] && (
                            <p className="text-sm text-destructive">
                              {validationErrors[block.id]}
                            </p>
                          )}
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
                              handleFieldChange(block.id, e.target.value)
                            }
                            placeholder={
                              block.placeholder
                                ? getLocalized(block.placeholder, language)
                                : undefined
                            }
                            disabled={isDisabled}
                          />
                          {validationErrors[block.id] && (
                            <p className="text-sm text-destructive">
                              {validationErrors[block.id]}
                            </p>
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
                                      handleFieldChange(
                                        block.id,
                                        newValues.join(","),
                                      );
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
                            {validationErrors[block.id] && (
                              <p className="text-sm text-destructive">
                                {validationErrors[block.id]}
                              </p>
                            )}
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
                              handleFieldChange(block.id, value)
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
                          {validationErrors[block.id] && (
                            <p className="text-sm text-destructive">
                              {validationErrors[block.id]}
                            </p>
                          )}
                        </FieldSet>
                      );
                    }

                    if (block.type === "slider") {
                      const currentValue = formResponses[block.id]
                        ? Number(formResponses[block.id])
                        : block.min;
                      return (
                        <Field key={index}>
                          <FieldLabel>
                            {getLocalized(block.label, language)}
                            {block.required && (
                              <span className="text-destructive ml-1">*</span>
                            )}
                          </FieldLabel>
                          <div>
                            <Slider
                              min={block.min}
                              max={block.max}
                              step={block.step}
                              value={[currentValue]}
                              onValueChange={([val]) =>
                                handleFieldChange(block.id, String(val))
                              }
                              disabled={isDisabled}
                            />
                            {block.tickmarks && block.tickmarks.length > 0 && (
                              <div className="relative w-full mt-1 h-5">
                                {block.tickmarks.map((tick, i) => {
                                  const pct = ((tick.value - block.min) / (block.max - block.min)) * 100;
                                  return (
                                    <span
                                      key={i}
                                      className="absolute text-xs text-muted-foreground -translate-x-1/2"
                                      style={{ left: `${pct}%` }}
                                    >
                                      {tick.label}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          {validationErrors[block.id] && (
                            <p className="text-sm text-destructive">
                              {validationErrors[block.id]}
                            </p>
                          )}
                          {block.helpText && (
                            <FieldDescription>
                              {getLocalized(block.helpText, language)}
                            </FieldDescription>
                          )}
                        </Field>
                      );
                    }

                    if (block.type === "stopwatch") {
                      return (
                        <Field key={index}>
                          <FieldLabel>
                            {getLocalized(block.label, language)}
                            {block.required && (
                              <span className="text-destructive ml-1">*</span>
                            )}
                          </FieldLabel>
                          <StopwatchInput
                            blockId={block.id}
                            resettable={block.resettable !== false}
                            duration={block.duration}
                            disabled={isDisabled}
                            value={formResponses[block.id] || ""}
                            onChange={(value) =>
                              handleFieldChange(block.id, value)
                            }
                          />
                          {validationErrors[block.id] && (
                            <p className="text-sm text-destructive">
                              {validationErrors[block.id]}
                            </p>
                          )}
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
                {!isPreviewMode && selectedTaskHasInputs && (
                  <Button
                    className="flex-1"
                    onClick={handleSubmitResponse}
                    disabled={isSubmitPending}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {language === "es" ? "Enviar respuesta" : "Submit Response"}
                  </Button>
                )}
                {!isPreviewMode && !selectedTaskHasInputs && !selectedTaskCompleted && (
                  <Button
                    className="flex-1"
                    onClick={handleMarkComplete}
                    disabled={isCompletePending}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {language === "es" ? "Marcar completado" : "Mark Complete"}
                  </Button>
                )}
                <DrawerClose asChild>
                  <Button
                    variant={!isPreviewMode && (selectedTaskHasInputs || !selectedTaskCompleted) ? "outline" : "default"}
                    className="flex-1"
                  >
                    {language === "es" ? "Cerrar" : "Close"}
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

// ============ ExperimentCard ============

// Minimal experiment shape needed for the card
export interface ExperimentCardData {
  id: string;
  name: LocalizedText;
  overviews?: Overview[];
  days: ExperimentDay[];
}

// Subscription data for live mode
export interface SubscriptionData {
  id: string;
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
  onCompleteTask?: (taskId: string, dayNumber: number) => void;
  onSubmitResponse?: (
    taskId: string,
    dayNumber: number,
    responses: Record<string, string>,
  ) => void;
  isStartPending?: boolean;
  isCompletePending?: boolean;
  isSubmitPending?: boolean;
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
  onSubmitResponse,
  isStartPending,
  isCompletePending,
  isSubmitPending,
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
                  <div className="border rounded-lg bg-muted/50 overflow-hidden mb-5 divide-y divide-border">
                    {experiment.overviews.map((overview) => (
                      <button
                        key={overview.id}
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
                  <TaskList
                    tasks={experiment.days?.[currentDay - 1]?.tasks ?? []}
                    language={language}
                    dayNumber={currentDay}
                    isTaskCompleted={(taskId) =>
                      isTaskCompleted?.(taskId, currentDay) ?? false
                    }
                    onCompleteTask={(taskId) =>
                      onCompleteTask?.(taskId, currentDay)
                    }
                    onSubmitResponse={(taskId, responses) =>
                      onSubmitResponse?.(taskId, currentDay, responses)
                    }
                    isCompletePending={isCompletePending}
                    isSubmitPending={isSubmitPending}
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
                <MarkdownRenderer
                  content={getLocalized(selectedOverview.content, language)}
                />
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
