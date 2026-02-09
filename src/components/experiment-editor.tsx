import React from "react";
import { useForm } from "@tanstack/react-form";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronRight,
  Copy,
  FileText,
  GripVertical,
  Hash,
  List,
  Plus,
  SlidersHorizontal,
  Trash2,
  Type,
} from "lucide-react";

import { ExperimentCard } from "@/components/experiment-card";
import { IconPicker } from "@/components/icon-picker";
import { MarkdownEditor } from "@/components/markdown-editor";
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
  CardLeadingAction,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  Block,
  ExperimentDay,
  Language,
  Overview,
  Task,
} from "@/types/shared";

// ============ Form Types ============

export interface OverviewFormValue {
  id: string;
  titleEn: string;
  titleEs: string;
  thumbnail: string;
  contentEn: string;
  contentEs: string;
}

// Block form value types
export interface MarkdownBlockFormValue {
  type: "markdown";
  id: string;
  contentEn: string;
  contentEs: string;
}

export interface TextBlockFormValue {
  type: "text";
  id: string;
  labelEn: string;
  labelEs: string;
  helpTextEn: string;
  helpTextEs: string;
  placeholderEn: string;
  placeholderEs: string;
  required: boolean;
}

export interface NumberBlockFormValue {
  type: "number";
  id: string;
  labelEn: string;
  labelEs: string;
  helpTextEn: string;
  helpTextEs: string;
  placeholderEn: string;
  placeholderEs: string;
  required: boolean;
}

export interface SelectOptionFormValue {
  value: string;
  labelEn: string;
  labelEs: string;
}

export interface SelectBlockFormValue {
  type: "select";
  id: string;
  labelEn: string;
  labelEs: string;
  helpTextEn: string;
  helpTextEs: string;
  required: boolean;
  multiple: boolean;
  options: SelectOptionFormValue[];
}

export interface SliderTickmarkFormValue {
  value: number;
  label: string;
}

export interface SliderBlockFormValue {
  type: "slider";
  id: string;
  labelEn: string;
  labelEs: string;
  helpTextEn: string;
  helpTextEs: string;
  required: boolean;
  min: number;
  max: number;
  step: number;
  tickmarks: SliderTickmarkFormValue[];
}

export type BlockFormValue =
  | MarkdownBlockFormValue
  | TextBlockFormValue
  | NumberBlockFormValue
  | SelectBlockFormValue
  | SliderBlockFormValue;

export interface TaskFormValue {
  id: string;
  nameEn: string;
  nameEs: string;
  icon: string;
  blocks: BlockFormValue[];
}

export interface DayFormValue {
  id: string;
  dayNumber: number;
  tasks: TaskFormValue[];
}

export interface ExperimentFormValues {
  nameEn: string;
  nameEs: string;
  boxId: string;
  overviews: OverviewFormValue[];
  days: DayFormValue[];
}

// ============ API Input Types ============

export interface OverviewApiInput {
  id: string;
  title: { en: string; es: string };
  thumbnail: string;
  content: { en: string; es: string };
}

export interface SelectOptionApiInput {
  value: string;
  label: { en: string; es: string };
}

export type BlockApiInput =
  | { type: "markdown"; id: string; content: { en?: string; es?: string } }
  | {
      type: "text";
      id: string;
      label: { en: string; es: string };
      helpText?: { en: string; es: string };
      placeholder?: { en: string; es: string };
      required?: boolean;
    }
  | {
      type: "number";
      id: string;
      label: { en: string; es: string };
      helpText?: { en: string; es: string };
      placeholder?: { en: string; es: string };
      required?: boolean;
    }
  | {
      type: "select";
      id: string;
      label: { en: string; es: string };
      helpText?: { en: string; es: string };
      required?: boolean;
      multiple?: boolean;
      options: SelectOptionApiInput[];
    }
  | {
      type: "slider";
      id: string;
      label: { en: string; es: string };
      helpText?: { en: string; es: string };
      required?: boolean;
      min: number;
      max: number;
      step: number;
      tickmarks?: { value: number; label: string }[];
    };

export interface TaskApiInput {
  id: string;
  name: { en: string; es: string };
  icon: string;
  blocks?: BlockApiInput[];
}

export interface DayApiInput {
  id: string;
  dayNumber: number;
  tasks: TaskApiInput[];
}

// ============ Conversion Functions ============

export function overviewToFormValue(overview: Overview): OverviewFormValue {
  return {
    id: overview.id,
    titleEn: overview.title.en,
    titleEs: overview.title.es,
    thumbnail: overview.thumbnail,
    contentEn: overview.content.en,
    contentEs: overview.content.es,
  };
}

export function formValueToOverview(
  value: OverviewFormValue,
): OverviewApiInput {
  return {
    id: value.id,
    title: { en: value.titleEn, es: value.titleEs },
    thumbnail: value.thumbnail,
    content: { en: value.contentEn, es: value.contentEs },
  };
}

function blockToFormValue(block: Block): BlockFormValue {
  if (block.type === "markdown") {
    return {
      type: "markdown",
      id: block.id,
      contentEn: block.content?.en ?? "",
      contentEs: block.content?.es ?? "",
    };
  }
  if (block.type === "text") {
    return {
      type: "text",
      id: block.id,
      labelEn: block.label.en,
      labelEs: block.label.es,
      helpTextEn: block.helpText?.en ?? "",
      helpTextEs: block.helpText?.es ?? "",
      placeholderEn: block.placeholder?.en ?? "",
      placeholderEs: block.placeholder?.es ?? "",
      required: block.required ?? false,
    };
  }
  if (block.type === "number") {
    return {
      type: "number",
      id: block.id,
      labelEn: block.label.en,
      labelEs: block.label.es,
      helpTextEn: block.helpText?.en ?? "",
      helpTextEs: block.helpText?.es ?? "",
      placeholderEn: block.placeholder?.en ?? "",
      placeholderEs: block.placeholder?.es ?? "",
      required: block.required ?? false,
    };
  }
  if (block.type === "slider") {
    return {
      type: "slider",
      id: block.id,
      labelEn: block.label.en,
      labelEs: block.label.es,
      helpTextEn: block.helpText?.en ?? "",
      helpTextEs: block.helpText?.es ?? "",
      required: block.required ?? false,
      min: block.min,
      max: block.max,
      step: block.step,
      tickmarks: (block.tickmarks ?? []).map((t) => ({ value: t.value, label: t.label })),
    };
  }
  // select
  return {
    type: "select",
    id: block.id,
    labelEn: block.label.en,
    labelEs: block.label.es,
    helpTextEn: block.helpText?.en ?? "",
    helpTextEs: block.helpText?.es ?? "",
    required: block.required ?? false,
    multiple: block.multiple ?? false,
    options: block.options.map((opt) => ({
      value: opt.value,
      labelEn: opt.label.en,
      labelEs: opt.label.es,
    })),
  };
}

function formValueToBlock(value: BlockFormValue): BlockApiInput {
  if (value.type === "markdown") {
    return {
      type: "markdown",
      id: value.id,
      content: { en: value.contentEn, es: value.contentEs },
    };
  }
  if (value.type === "text") {
    return {
      type: "text",
      id: value.id,
      label: { en: value.labelEn, es: value.labelEs },
      helpText:
        value.helpTextEn || value.helpTextEs
          ? { en: value.helpTextEn, es: value.helpTextEs }
          : undefined,
      placeholder:
        value.placeholderEn || value.placeholderEs
          ? { en: value.placeholderEn, es: value.placeholderEs }
          : undefined,
      required: value.required || undefined,
    };
  }
  if (value.type === "number") {
    return {
      type: "number",
      id: value.id,
      label: { en: value.labelEn, es: value.labelEs },
      helpText:
        value.helpTextEn || value.helpTextEs
          ? { en: value.helpTextEn, es: value.helpTextEs }
          : undefined,
      placeholder:
        value.placeholderEn || value.placeholderEs
          ? { en: value.placeholderEn, es: value.placeholderEs }
          : undefined,
      required: value.required || undefined,
    };
  }
  if (value.type === "slider") {
    return {
      type: "slider",
      id: value.id,
      label: { en: value.labelEn, es: value.labelEs },
      helpText:
        value.helpTextEn || value.helpTextEs
          ? { en: value.helpTextEn, es: value.helpTextEs }
          : undefined,
      required: value.required || undefined,
      min: value.min,
      max: value.max,
      step: value.step,
      tickmarks: value.tickmarks.length > 0 ? value.tickmarks : undefined,
    };
  }
  // select
  return {
    type: "select",
    id: value.id,
    label: { en: value.labelEn, es: value.labelEs },
    helpText:
      value.helpTextEn || value.helpTextEs
        ? { en: value.helpTextEn, es: value.helpTextEs }
        : undefined,
    required: value.required || undefined,
    multiple: value.multiple || undefined,
    options: value.options.map((opt) => ({
      value: opt.value,
      label: { en: opt.labelEn, es: opt.labelEs },
    })),
  };
}

export function taskToFormValue(task: Task): TaskFormValue {
  return {
    id: task.id,
    nameEn: task.name.en,
    nameEs: task.name.es,
    icon: task.icon,
    blocks: (task.blocks ?? []).map(blockToFormValue),
  };
}

export function formValueToTask(value: TaskFormValue): TaskApiInput {
  return {
    id: value.id,
    name: { en: value.nameEn, es: value.nameEs },
    icon: value.icon,
    blocks: value.blocks.map(formValueToBlock),
  };
}

export function dayToFormValue(day: ExperimentDay): DayFormValue {
  return {
    id: day.id,
    dayNumber: day.dayNumber,
    tasks: day.tasks.map(taskToFormValue),
  };
}

export function formValueToDay(value: DayFormValue): DayApiInput {
  return {
    id: value.id,
    dayNumber: value.dayNumber,
    tasks: value.tasks.map(formValueToTask),
  };
}

// ============ Editor Components ============

function OverviewEditor({
  form,
  index,
  onRemove,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  index: number;
  onRemove: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CardHeader className="items-center">
          <CollapsibleTrigger asChild>
            <CardHeaderTrigger />
          </CollapsibleTrigger>
          <CardLeadingAction>
            <ChevronRight
              className={`size-4 transition-transform text-muted-foreground ${open ? "rotate-90" : ""}`}
            />
          </CardLeadingAction>
          <CardHeaderText>
            <form.Subscribe
              selector={(state: {
                values: { overviews: OverviewFormValue[] };
              }) => ({
                titleEn: state.values.overviews[index]?.titleEn,
                titleEs: state.values.overviews[index]?.titleEs,
              })}
            >
              {({ titleEn, titleEs }: { titleEn: string; titleEs: string }) => (
                <CardTitle className="truncate text-sm">
                  {titleEn || titleEs || "(Untitled)"}
                </CardTitle>
              )}
            </form.Subscribe>
          </CardHeaderText>
          <CardAction>
            <Button
              type="button"
              variant="ghost"
              size="iconSm"
              onClick={onRemove}
            >
              <Trash2 className="size-4" />
            </Button>
          </CardAction>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <form.Field name={`overviews[${index}].titleEn`}>
              {(subField: {
                state: { value: string };
                handleChange: (v: string) => void;
              }) => (
                <Field>
                  <FieldLabel>Title (English)</FieldLabel>
                  <Input
                    value={subField.state.value}
                    onChange={(e) => subField.handleChange(e.target.value)}
                    placeholder="Enter title in English"
                  />
                </Field>
              )}
            </form.Field>
            <form.Field name={`overviews[${index}].titleEs`}>
              {(subField: {
                state: { value: string };
                handleChange: (v: string) => void;
              }) => (
                <Field>
                  <FieldLabel>Title (Spanish)</FieldLabel>
                  <Input
                    value={subField.state.value}
                    onChange={(e) => subField.handleChange(e.target.value)}
                    placeholder="Enter title in Spanish"
                  />
                </Field>
              )}
            </form.Field>
            <form.Field name={`overviews[${index}].thumbnail`}>
              {(subField: {
                state: { value: string };
                handleChange: (v: string) => void;
              }) => (
                <Field>
                  <FieldLabel>Thumbnail URL</FieldLabel>
                  <Input
                    value={subField.state.value}
                    onChange={(e) => subField.handleChange(e.target.value)}
                    placeholder="https://..."
                  />
                </Field>
              )}
            </form.Field>
            <form.Field name={`overviews[${index}].contentEn`}>
              {(subField: {
                state: { value: string };
                handleChange: (v: string) => void;
              }) => (
                <Field>
                  <FieldLabel>Content (English)</FieldLabel>
                  <MarkdownEditor
                    value={subField.state.value}
                    onChange={subField.handleChange}
                    placeholder="Markdown content..."
                  />
                </Field>
              )}
            </form.Field>
            <form.Field name={`overviews[${index}].contentEs`}>
              {(subField: {
                state: { value: string };
                handleChange: (v: string) => void;
              }) => (
                <Field>
                  <FieldLabel>Content (Spanish)</FieldLabel>
                  <MarkdownEditor
                    value={subField.state.value}
                    onChange={subField.handleChange}
                    placeholder="Contenido en markdown..."
                  />
                </Field>
              )}
            </form.Field>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// Block type icons and labels
const blockTypeInfo = {
  markdown: { icon: FileText, label: "Markdown" },
  text: { icon: Type, label: "Text Input" },
  number: { icon: Hash, label: "Number Input" },
  select: { icon: List, label: "Select" },
  slider: { icon: SlidersHorizontal, label: "Slider" },
};

function BlockEditor({
  form,
  dayIndex,
  taskIndex,
  blockIndex,
  blockType,
  sortableId,
  isActive,
  onRemove,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  dayIndex: number;
  taskIndex: number;
  blockIndex: number;
  blockType: BlockFormValue["type"];
  sortableId: string;
  isActive: boolean;
  onRemove: () => void;
}) {
  const [open, setOpen] = React.useState(true);
  const basePath = `days[${dayIndex}].tasks[${taskIndex}].blocks[${blockIndex}]`;
  const Icon = blockTypeInfo[blockType].icon;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: sortableId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Hide the original item while dragging (DragOverlay shows the preview)
    opacity: isActive ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border-y border-border -mt-px last:-mb-px bg-muted/50"
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="relative flex items-center gap-2 p-3">
          <CollapsibleTrigger className="absolute inset-0 w-full h-full cursor-pointer z-0" />
          <button
            type="button"
            className="relative z-10 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
          <ChevronRight
            className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
          />
          <Icon className="size-4 text-muted-foreground" />
          <span className="flex-1 text-sm font-medium">
            {blockTypeInfo[blockType].label}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="iconSm"
            className="relative z-10"
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-3">
            {blockType === "markdown" && (
              <>
                <form.Field name={`${basePath}.contentEn`}>
                  {(subField: {
                    state: { value: string };
                    handleChange: (v: string) => void;
                  }) => (
                    <Field>
                      <FieldLabel>Content (English)</FieldLabel>
                      <MarkdownEditor
                        value={subField.state.value}
                        onChange={subField.handleChange}
                        placeholder="Markdown content..."
                      />
                    </Field>
                  )}
                </form.Field>
                <form.Field name={`${basePath}.contentEs`}>
                  {(subField: {
                    state: { value: string };
                    handleChange: (v: string) => void;
                  }) => (
                    <Field>
                      <FieldLabel>Content (Spanish)</FieldLabel>
                      <MarkdownEditor
                        value={subField.state.value}
                        onChange={subField.handleChange}
                        placeholder="Contenido en markdown..."
                      />
                    </Field>
                  )}
                </form.Field>
              </>
            )}

            {(blockType === "text" || blockType === "number") && (
              <>
                <form.Field name={`${basePath}.labelEn`}>
                  {(subField: {
                    state: { value: string };
                    handleChange: (v: string) => void;
                  }) => (
                    <Field>
                      <FieldLabel>Label (English)</FieldLabel>
                      <Input
                        value={subField.state.value}
                        onChange={(e) => subField.handleChange(e.target.value)}
                        placeholder="Field label..."
                      />
                    </Field>
                  )}
                </form.Field>
                <form.Field name={`${basePath}.labelEs`}>
                  {(subField: {
                    state: { value: string };
                    handleChange: (v: string) => void;
                  }) => (
                    <Field>
                      <FieldLabel>Label (Spanish)</FieldLabel>
                      <Input
                        value={subField.state.value}
                        onChange={(e) => subField.handleChange(e.target.value)}
                        placeholder="Etiqueta del campo..."
                      />
                    </Field>
                  )}
                </form.Field>
                <form.Field name={`${basePath}.placeholderEn`}>
                  {(subField: {
                    state: { value: string };
                    handleChange: (v: string) => void;
                  }) => (
                    <Field>
                      <FieldLabel>Placeholder (English)</FieldLabel>
                      <Input
                        value={subField.state.value}
                        onChange={(e) => subField.handleChange(e.target.value)}
                        placeholder="Placeholder text..."
                      />
                    </Field>
                  )}
                </form.Field>
                <form.Field name={`${basePath}.placeholderEs`}>
                  {(subField: {
                    state: { value: string };
                    handleChange: (v: string) => void;
                  }) => (
                    <Field>
                      <FieldLabel>Placeholder (Spanish)</FieldLabel>
                      <Input
                        value={subField.state.value}
                        onChange={(e) => subField.handleChange(e.target.value)}
                        placeholder="Texto de marcador..."
                      />
                    </Field>
                  )}
                </form.Field>
                <form.Field name={`${basePath}.helpTextEn`}>
                  {(subField: {
                    state: { value: string };
                    handleChange: (v: string) => void;
                  }) => (
                    <Field>
                      <FieldLabel>Help Text (English)</FieldLabel>
                      <Input
                        value={subField.state.value}
                        onChange={(e) => subField.handleChange(e.target.value)}
                        placeholder="Optional help text..."
                      />
                    </Field>
                  )}
                </form.Field>
                <form.Field name={`${basePath}.helpTextEs`}>
                  {(subField: {
                    state: { value: string };
                    handleChange: (v: string) => void;
                  }) => (
                    <Field>
                      <FieldLabel>Help Text (Spanish)</FieldLabel>
                      <Input
                        value={subField.state.value}
                        onChange={(e) => subField.handleChange(e.target.value)}
                        placeholder="Texto de ayuda opcional..."
                      />
                    </Field>
                  )}
                </form.Field>
                <form.Field name={`${basePath}.required`}>
                  {(subField: {
                    state: { value: boolean };
                    handleChange: (v: boolean) => void;
                  }) => (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`${basePath}.required`}
                        checked={subField.state.value}
                        onCheckedChange={subField.handleChange}
                      />
                      <Label htmlFor={`${basePath}.required`}>Required</Label>
                    </div>
                  )}
                </form.Field>
              </>
            )}

            {blockType === "select" && (
              <>
                <form.Field name={`${basePath}.labelEn`}>
                  {(subField: {
                    state: { value: string };
                    handleChange: (v: string) => void;
                  }) => (
                    <Field>
                      <FieldLabel>Label (English)</FieldLabel>
                      <Input
                        value={subField.state.value}
                        onChange={(e) => subField.handleChange(e.target.value)}
                        placeholder="Field label..."
                      />
                    </Field>
                  )}
                </form.Field>
                <form.Field name={`${basePath}.labelEs`}>
                  {(subField: {
                    state: { value: string };
                    handleChange: (v: string) => void;
                  }) => (
                    <Field>
                      <FieldLabel>Label (Spanish)</FieldLabel>
                      <Input
                        value={subField.state.value}
                        onChange={(e) => subField.handleChange(e.target.value)}
                        placeholder="Etiqueta del campo..."
                      />
                    </Field>
                  )}
                </form.Field>
                <form.Field name={`${basePath}.helpTextEn`}>
                  {(subField: {
                    state: { value: string };
                    handleChange: (v: string) => void;
                  }) => (
                    <Field>
                      <FieldLabel>Help Text (English)</FieldLabel>
                      <Input
                        value={subField.state.value}
                        onChange={(e) => subField.handleChange(e.target.value)}
                        placeholder="Optional help text..."
                      />
                    </Field>
                  )}
                </form.Field>
                <form.Field name={`${basePath}.helpTextEs`}>
                  {(subField: {
                    state: { value: string };
                    handleChange: (v: string) => void;
                  }) => (
                    <Field>
                      <FieldLabel>Help Text (Spanish)</FieldLabel>
                      <Input
                        value={subField.state.value}
                        onChange={(e) => subField.handleChange(e.target.value)}
                        placeholder="Texto de ayuda opcional..."
                      />
                    </Field>
                  )}
                </form.Field>
                <form.Field name={`${basePath}.required`}>
                  {(subField: {
                    state: { value: boolean };
                    handleChange: (v: boolean) => void;
                  }) => (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`${basePath}.required`}
                        checked={subField.state.value}
                        onCheckedChange={subField.handleChange}
                      />
                      <Label htmlFor={`${basePath}.required`}>Required</Label>
                    </div>
                  )}
                </form.Field>
                <form.Field name={`${basePath}.multiple`}>
                  {(subField: {
                    state: { value: boolean };
                    handleChange: (v: boolean) => void;
                  }) => (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`${basePath}.multiple`}
                        checked={subField.state.value}
                        onCheckedChange={subField.handleChange}
                      />
                      <Label htmlFor={`${basePath}.multiple`}>
                        Allow multiple selections
                      </Label>
                    </div>
                  )}
                </form.Field>

                {/* Options editor */}
                <form.Field name={`${basePath}.options`} mode="array">
                  {(field: {
                    state: { value: SelectOptionFormValue[] };
                    pushValue: (v: SelectOptionFormValue) => void;
                    removeValue: (i: number) => void;
                  }) => (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <FieldLabel>Options</FieldLabel>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            field.pushValue({
                              value: `option_${field.state.value.length + 1}`,
                              labelEn: "",
                              labelEs: "",
                            })
                          }
                        >
                          <Plus className="size-4" />
                          Add Option
                        </Button>
                      </div>
                      {field.state.value.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No options. Add at least one option for the select.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {field.state.value.map((_, optIndex) => (
                            <div
                              key={optIndex}
                              className="flex gap-2 items-start border rounded-lg p-2 bg-muted/50"
                            >
                              <div className="flex-1 space-y-2">
                                <form.Field
                                  name={`${basePath}.options[${optIndex}].value`}
                                >
                                  {(subField: {
                                    state: { value: string };
                                    handleChange: (v: string) => void;
                                  }) => (
                                    <Input
                                      value={subField.state.value}
                                      onChange={(e) =>
                                        subField.handleChange(e.target.value)
                                      }
                                      placeholder="Value (unique key)"
                                      className="text-xs"
                                    />
                                  )}
                                </form.Field>
                                <form.Field
                                  name={`${basePath}.options[${optIndex}].labelEn`}
                                >
                                  {(subField: {
                                    state: { value: string };
                                    handleChange: (v: string) => void;
                                  }) => (
                                    <Input
                                      value={subField.state.value}
                                      onChange={(e) =>
                                        subField.handleChange(e.target.value)
                                      }
                                      placeholder="Label (English)"
                                      className="text-xs"
                                    />
                                  )}
                                </form.Field>
                                <form.Field
                                  name={`${basePath}.options[${optIndex}].labelEs`}
                                >
                                  {(subField: {
                                    state: { value: string };
                                    handleChange: (v: string) => void;
                                  }) => (
                                    <Input
                                      value={subField.state.value}
                                      onChange={(e) =>
                                        subField.handleChange(e.target.value)
                                      }
                                      placeholder="Label (Spanish)"
                                      className="text-xs"
                                    />
                                  )}
                                </form.Field>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="iconSm"
                                onClick={() => field.removeValue(optIndex)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </form.Field>
              </>
            )}

            {blockType === "slider" && (
              <>
                <form.Field name={`${basePath}.labelEn`}>
                  {(subField: {
                    state: { value: string };
                    handleChange: (v: string) => void;
                  }) => (
                    <Field>
                      <FieldLabel>Label (English)</FieldLabel>
                      <Input
                        value={subField.state.value}
                        onChange={(e) => subField.handleChange(e.target.value)}
                        placeholder="Field label..."
                      />
                    </Field>
                  )}
                </form.Field>
                <form.Field name={`${basePath}.labelEs`}>
                  {(subField: {
                    state: { value: string };
                    handleChange: (v: string) => void;
                  }) => (
                    <Field>
                      <FieldLabel>Label (Spanish)</FieldLabel>
                      <Input
                        value={subField.state.value}
                        onChange={(e) => subField.handleChange(e.target.value)}
                        placeholder="Etiqueta del campo..."
                      />
                    </Field>
                  )}
                </form.Field>
                <form.Field name={`${basePath}.helpTextEn`}>
                  {(subField: {
                    state: { value: string };
                    handleChange: (v: string) => void;
                  }) => (
                    <Field>
                      <FieldLabel>Help Text (English)</FieldLabel>
                      <Input
                        value={subField.state.value}
                        onChange={(e) => subField.handleChange(e.target.value)}
                        placeholder="Optional help text..."
                      />
                    </Field>
                  )}
                </form.Field>
                <form.Field name={`${basePath}.helpTextEs`}>
                  {(subField: {
                    state: { value: string };
                    handleChange: (v: string) => void;
                  }) => (
                    <Field>
                      <FieldLabel>Help Text (Spanish)</FieldLabel>
                      <Input
                        value={subField.state.value}
                        onChange={(e) => subField.handleChange(e.target.value)}
                        placeholder="Texto de ayuda opcional..."
                      />
                    </Field>
                  )}
                </form.Field>
                <form.Field name={`${basePath}.min`}>
                  {(subField: {
                    state: { value: number };
                    handleChange: (v: number) => void;
                  }) => (
                    <Field>
                      <FieldLabel>Min</FieldLabel>
                      <Input
                        type="number"
                        value={subField.state.value}
                        onChange={(e) =>
                          subField.handleChange(Number(e.target.value))
                        }
                      />
                    </Field>
                  )}
                </form.Field>
                <form.Field name={`${basePath}.max`}>
                  {(subField: {
                    state: { value: number };
                    handleChange: (v: number) => void;
                  }) => (
                    <Field>
                      <FieldLabel>Max</FieldLabel>
                      <Input
                        type="number"
                        value={subField.state.value}
                        onChange={(e) =>
                          subField.handleChange(Number(e.target.value))
                        }
                      />
                    </Field>
                  )}
                </form.Field>
                <form.Field name={`${basePath}.step`}>
                  {(subField: {
                    state: { value: number };
                    handleChange: (v: number) => void;
                  }) => (
                    <Field>
                      <FieldLabel>Step</FieldLabel>
                      <Input
                        type="number"
                        value={subField.state.value}
                        onChange={(e) =>
                          subField.handleChange(Number(e.target.value))
                        }
                      />
                    </Field>
                  )}
                </form.Field>
                <form.Field name={`${basePath}.tickmarks`}>
                  {(subField: {
                    state: { value: SliderTickmarkFormValue[] };
                    handleChange: (v: SliderTickmarkFormValue[]) => void;
                  }) => (
                    <Field>
                      <FieldLabel>Tickmarks</FieldLabel>
                      <div className="space-y-2">
                        {subField.state.value.map((tick, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Input
                              type="number"
                              className="w-20"
                              placeholder="Value"
                              value={tick.value}
                              onChange={(e) => {
                                const updated = [...subField.state.value];
                                updated[i] = { ...updated[i], value: Number(e.target.value) };
                                subField.handleChange(updated);
                              }}
                            />
                            <Input
                              className="flex-1"
                              placeholder="Label"
                              value={tick.label}
                              onChange={(e) => {
                                const updated = [...subField.state.value];
                                updated[i] = { ...updated[i], label: e.target.value };
                                subField.handleChange(updated);
                              }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const updated = subField.state.value.filter((_, j) => j !== i);
                                subField.handleChange(updated);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            subField.handleChange([
                              ...subField.state.value,
                              { value: 0, label: "" },
                            ]);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Tickmark
                        </Button>
                      </div>
                    </Field>
                  )}
                </form.Field>
                <form.Field name={`${basePath}.required`}>
                  {(subField: {
                    state: { value: boolean };
                    handleChange: (v: boolean) => void;
                  }) => (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`${basePath}.required`}
                        checked={subField.state.value}
                        onCheckedChange={subField.handleChange}
                      />
                      <Label htmlFor={`${basePath}.required`}>Required</Label>
                    </div>
                  )}
                </form.Field>
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Drop animation configuration
const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.5",
      },
    },
  }),
};

// Block preview for DragOverlay - matches actual item styling
function BlockDragPreview({ blockType }: { blockType: BlockFormValue["type"] }) {
  const Icon = blockTypeInfo[blockType].icon;
  return (
    <div className="flex items-center gap-2 p-3 bg-muted/50 border-y border-border shadow-md">
      <GripVertical className="size-4 text-muted-foreground" />
      <ChevronRight className="size-4 text-muted-foreground" />
      <Icon className="size-4 text-muted-foreground" />
      <span className="flex-1 text-sm font-medium">{blockTypeInfo[blockType].label}</span>
    </div>
  );
}

function TaskEditor({
  form,
  dayIndex,
  taskIndex,
  sortableId,
  isActive,
  onRemove,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  dayIndex: number;
  taskIndex: number;
  sortableId: string;
  isActive: boolean;
  onRemove: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [activeBlockId, setActiveBlockId] = React.useState<UniqueIdentifier | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: sortableId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Hide the original item while dragging (DragOverlay shows the preview)
    opacity: isActive ? 0 : 1,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const createBlock = (type: BlockFormValue["type"]): BlockFormValue => {
    const id = crypto.randomUUID();
    if (type === "markdown") {
      return { type: "markdown", id, contentEn: "", contentEs: "" };
    }
    if (type === "text") {
      return {
        type: "text",
        id,
        labelEn: "",
        labelEs: "",
        helpTextEn: "",
        helpTextEs: "",
        placeholderEn: "",
        placeholderEs: "",
        required: false,
      };
    }
    if (type === "number") {
      return {
        type: "number",
        id,
        labelEn: "",
        labelEs: "",
        helpTextEn: "",
        helpTextEs: "",
        placeholderEn: "",
        placeholderEs: "",
        required: false,
      };
    }
    if (type === "slider") {
      return {
        type: "slider",
        id,
        labelEn: "",
        labelEs: "",
        helpTextEn: "",
        helpTextEs: "",
        required: false,
        min: 0,
        max: 100,
        step: 1,
        tickmarks: [],
      };
    }
    return {
      type: "select",
      id,
      labelEn: "",
      labelEs: "",
      helpTextEn: "",
      helpTextEs: "",
      required: false,
      multiple: false,
      options: [],
    };
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border-y border-border -mt-px last:-mb-px bg-muted/50"
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="relative flex items-center gap-2 p-3">
          <CollapsibleTrigger className="absolute inset-0 w-full h-full cursor-pointer z-0"></CollapsibleTrigger>
          <button
            type="button"
            className="relative z-10 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
          <ChevronRight
            className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
          />
          <form.Subscribe
            selector={(state: { values: { days: DayFormValue[] } }) => ({
              nameEn: state.values.days[dayIndex]?.tasks[taskIndex]?.nameEn,
              nameEs: state.values.days[dayIndex]?.tasks[taskIndex]?.nameEs,
            })}
          >
            {({ nameEn, nameEs }: { nameEn: string; nameEs: string }) => (
              <span className="flex-1 text-sm font-medium truncate">
                {nameEn || nameEs || "(Untitled)"}
              </span>
            )}
          </form.Subscribe>
          <Button
            type="button"
            variant="ghost"
            size="iconSm"
            className="relative z-10"
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-4">
            <form.Field name={`days[${dayIndex}].tasks[${taskIndex}].icon`}>
              {(subField: {
                state: { value: string };
                handleChange: (v: string) => void;
              }) => (
                <Field>
                  <FieldLabel>Icon</FieldLabel>
                  <IconPicker
                    value={subField.state.value}
                    onChange={subField.handleChange}
                  />
                </Field>
              )}
            </form.Field>
            <form.Field name={`days[${dayIndex}].tasks[${taskIndex}].nameEn`}>
              {(subField: {
                state: { value: string };
                handleChange: (v: string) => void;
              }) => (
                <Field>
                  <FieldLabel>Name (English)</FieldLabel>
                  <Input
                    value={subField.state.value}
                    onChange={(e) => subField.handleChange(e.target.value)}
                    placeholder="Task name in English"
                  />
                </Field>
              )}
            </form.Field>
            <form.Field name={`days[${dayIndex}].tasks[${taskIndex}].nameEs`}>
              {(subField: {
                state: { value: string };
                handleChange: (v: string) => void;
              }) => (
                <Field>
                  <FieldLabel>Name (Spanish)</FieldLabel>
                  <Input
                    value={subField.state.value}
                    onChange={(e) => subField.handleChange(e.target.value)}
                    placeholder="Task name in Spanish"
                  />
                </Field>
              )}
            </form.Field>

            {/* Blocks section */}
            <form.Field
              name={`days[${dayIndex}].tasks[${taskIndex}].blocks`}
              mode="array"
            >
              {(field: {
                state: { value: BlockFormValue[] };
                pushValue: (v: BlockFormValue) => void;
                removeValue: (i: number) => void;
              }) => (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Content Blocks</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="outline" size="sm">
                          <Plus className="size-4" />
                          Add Block
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            field.pushValue(createBlock("markdown"))
                          }
                        >
                          <FileText className="size-4" />
                          Markdown
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => field.pushValue(createBlock("text"))}
                        >
                          <Type className="size-4" />
                          Text Input
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => field.pushValue(createBlock("number"))}
                        >
                          <Hash className="size-4" />
                          Number Input
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => field.pushValue(createBlock("select"))}
                        >
                          <List className="size-4" />
                          Select
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => field.pushValue(createBlock("slider"))}
                        >
                          <SlidersHorizontal className="size-4" />
                          Slider
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {field.state.value.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No blocks yet. Add markdown content or input fields.
                    </p>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      modifiers={[restrictToVerticalAxis]}
                      onDragStart={(event: DragStartEvent) => {
                        setActiveBlockId(event.active.id);
                      }}
                      onDragEnd={(event: DragEndEvent) => {
                        const { active, over } = event;
                        setActiveBlockId(null);
                        if (over && active.id !== over.id) {
                          const oldIndex = field.state.value.findIndex(
                            (block) => block.id === active.id,
                          );
                          const newIndex = field.state.value.findIndex(
                            (block) => block.id === over.id,
                          );
                          if (oldIndex !== -1 && newIndex !== -1) {
                            const newBlocks = arrayMove(
                              field.state.value,
                              oldIndex,
                              newIndex,
                            );
                            form.setFieldValue(
                              `days[${dayIndex}].tasks[${taskIndex}].blocks`,
                              newBlocks,
                            );
                          }
                        }
                      }}
                      onDragCancel={() => setActiveBlockId(null)}
                    >
                      <SortableContext
                        items={field.state.value.map((block) => block.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="border border-border rounded-lg overflow-hidden">
                          {field.state.value.map((block, blockIndex) => (
                            <BlockEditor
                              key={block.id}
                              form={form}
                              dayIndex={dayIndex}
                              taskIndex={taskIndex}
                              blockIndex={blockIndex}
                              blockType={block.type}
                              sortableId={block.id}
                              isActive={activeBlockId === block.id}
                              onRemove={() => field.removeValue(blockIndex)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                      <DragOverlay dropAnimation={dropAnimationConfig}>
                        {activeBlockId != null ? (
                          <BlockDragPreview
                            blockType={
                              field.state.value.find((b) => b.id === activeBlockId)?.type ?? "markdown"
                            }
                          />
                        ) : null}
                      </DragOverlay>
                    </DndContext>
                  )}
                </div>
              )}
            </form.Field>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Task preview for DragOverlay - matches actual item styling
function TaskDragPreview({ taskName }: { taskName: string }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-muted/50 border-y border-border shadow-md">
      <GripVertical className="size-4 text-muted-foreground" />
      <ChevronRight className="size-4 text-muted-foreground" />
      <span className="flex-1 text-sm font-medium truncate">{taskName || "(Untitled)"}</span>
    </div>
  );
}

function DayEditor({
  form,
  dayIndex,
  dayNumber,
  taskCount,
  onRemove,
  onCopy,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  dayIndex: number;
  dayNumber: number;
  taskCount: number;
  onRemove: () => void;
  onCopy: () => void;
}) {
  const [open, setOpen] = React.useState(true);
  const [activeTaskId, setActiveTaskId] = React.useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CardHeader>
          <CollapsibleTrigger asChild>
            <CardHeaderTrigger />
          </CollapsibleTrigger>
          <CardLeadingAction>
            <ChevronRight
              className={`size-4 mt-0.5 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
            />
          </CardLeadingAction>
          <CardHeaderText className="gap-1">
            <CardTitle className="text-sm">Day {dayNumber}</CardTitle>
            <CardDescription>
              {taskCount} {taskCount === 1 ? "task" : "tasks"}
            </CardDescription>
          </CardHeaderText>
          <CardAction className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="iconSm"
              onClick={onCopy}
              title="Copy to next day"
            >
              <Copy className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="iconSm"
              onClick={onRemove}
            >
              <Trash2 className="size-4" />
            </Button>
          </CardAction>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <form.Field name={`days[${dayIndex}].tasks`} mode="array">
              {(field: {
                state: { value: TaskFormValue[] };
                pushValue: (v: TaskFormValue) => void;
                removeValue: (i: number) => void;
              }) => (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Tasks</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        field.pushValue({
                          id: crypto.randomUUID(),
                          nameEn: "",
                          nameEs: "",
                          icon: "check",
                          blocks: [],
                        })
                      }
                    >
                      <Plus className="size-4" />
                      Add Task
                    </Button>
                  </div>
                  {field.state.value.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No tasks yet. Add one to define what users should do on
                      this day.
                    </p>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      modifiers={[restrictToVerticalAxis]}
                      onDragStart={(event: DragStartEvent) => {
                        setActiveTaskId(event.active.id);
                      }}
                      onDragEnd={(event: DragEndEvent) => {
                        const { active, over } = event;
                        setActiveTaskId(null);
                        if (over && active.id !== over.id) {
                          const oldIndex = field.state.value.findIndex(
                            (task) => task.id === active.id,
                          );
                          const newIndex = field.state.value.findIndex(
                            (task) => task.id === over.id,
                          );
                          if (oldIndex !== -1 && newIndex !== -1) {
                            const newTasks = arrayMove(
                              field.state.value,
                              oldIndex,
                              newIndex,
                            );
                            form.setFieldValue(
                              `days[${dayIndex}].tasks`,
                              newTasks,
                            );
                          }
                        }
                      }}
                      onDragCancel={() => setActiveTaskId(null)}
                    >
                      <SortableContext
                        items={field.state.value.map((task) => task.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="border border-border rounded-lg overflow-hidden">
                          {field.state.value.map((task, taskIndex) => (
                            <TaskEditor
                              key={task.id}
                              form={form}
                              dayIndex={dayIndex}
                              taskIndex={taskIndex}
                              sortableId={task.id}
                              isActive={activeTaskId === task.id}
                              onRemove={() => field.removeValue(taskIndex)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                      <DragOverlay dropAnimation={dropAnimationConfig}>
                        {activeTaskId != null ? (
                          <TaskDragPreview
                            taskName={
                              field.state.value.find((t) => t.id === activeTaskId)?.nameEn ?? ""
                            }
                          />
                        ) : null}
                      </DragOverlay>
                    </DndContext>
                  )}
                </>
              )}
            </form.Field>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ============ Main Editor Component ============

export interface BoxOption {
  id: string;
  name: { en: string; es: string };
}

export interface ExperimentEditorProps {
  // Initial values (for edit mode)
  initialValues?: ExperimentFormValues;
  // Experiment ID (for preview in edit mode)
  experimentId?: string;
  // Status (for edit mode)
  status?: "draft" | "published";
  // Title to display
  title: string;
  // Available boxes
  boxes: BoxOption[];
  // Callbacks
  onSave: (values: ExperimentFormValues) => void;
  onPublish?: (values: ExperimentFormValues) => void;
  onUnpublish?: () => void;
  // Loading states
  isSaving?: boolean;
  isPublishing?: boolean;
  isUnpublishing?: boolean;
}

const defaultValues: ExperimentFormValues = {
  nameEn: "",
  nameEs: "",
  boxId: "",
  overviews: [],
  days: [],
};

export function ExperimentEditor({
  initialValues,
  experimentId,
  status,
  title,
  boxes,
  onSave,
  onPublish,
  onUnpublish,
  isSaving,
  isPublishing,
  isUnpublishing,
}: ExperimentEditorProps) {
  const [previewLang, setPreviewLang] = React.useState<Language>("en");
  const isEditMode = !!initialValues;

  const form = useForm({
    defaultValues: initialValues ?? defaultValues,
    onSubmit: async ({ value }) => {
      onSave(value);
    },
  });

  const handlePublish = () => {
    onPublish?.(form.state.values);
  };

  const isPending = isSaving || isPublishing || isUnpublishing;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        {status && (
          <Badge variant={status === "published" ? "default" : "secondary"}>
            {status}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field name="nameEn">
              {(field) => (
                <Field>
                  <FieldLabel>Name (English)</FieldLabel>
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Enter name in English"
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="nameEs">
              {(field) => (
                <Field>
                  <FieldLabel>Name (Spanish)</FieldLabel>
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Enter name in Spanish"
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="boxId">
              {(field) => (
                <Field>
                  <FieldLabel>Box</FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={field.handleChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a box" />
                    </SelectTrigger>
                    <SelectContent>
                      {boxes.map((box) => (
                        <SelectItem key={box.id} value={box.id}>
                          {box.name.en || "(Untitled)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>

            <div className="mt-8 pt-8 border-t">
              <form.Field name="overviews" mode="array">
                {(field) => (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold">
                        Overviews ({field.state.value.length})
                      </h2>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          field.pushValue({
                            id: crypto.randomUUID(),
                            titleEn: "",
                            titleEs: "",
                            thumbnail: "",
                            contentEn: "",
                            contentEs: "",
                          })
                        }
                      >
                        <Plus className="size-4" />
                        Add Overview
                      </Button>
                    </div>
                    {field.state.value.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No overviews yet. Add one to provide additional context
                        about the experiment.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {field.state.value.map((item, index) => (
                          <OverviewEditor
                            key={item.id}
                            form={form}
                            index={index}
                            onRemove={() => field.removeValue(index)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </form.Field>
            </div>

            <div className="mt-8 pt-8 border-t">
              <form.Field name="days" mode="array">
                {(field) => (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold">
                        Days ({field.state.value.length})
                      </h2>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const nextDayNumber =
                            field.state.value.length > 0
                              ? Math.max(
                                  ...field.state.value.map((d) => d.dayNumber),
                                ) + 1
                              : 1;
                          field.pushValue({
                            id: crypto.randomUUID(),
                            dayNumber: nextDayNumber,
                            tasks: [],
                          });
                        }}
                      >
                        <Plus className="size-4" />
                        Add Day
                      </Button>
                    </div>
                    {field.state.value.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No days yet. Add one to define the experiment schedule.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {field.state.value.map((day, dayIndex) => (
                          <DayEditor
                            key={day.id}
                            form={form}
                            dayIndex={dayIndex}
                            dayNumber={day.dayNumber}
                            taskCount={day.tasks.length}
                            onRemove={() => field.removeValue(dayIndex)}
                            onCopy={() => {
                              const nextDayNumber =
                                Math.max(
                                  ...field.state.value.map((d) => d.dayNumber),
                                ) + 1;
                              // Deep clone tasks with new IDs
                              const copiedTasks = day.tasks.map((task) => ({
                                ...task,
                                id: crypto.randomUUID(),
                                blocks: task.blocks.map((block) => ({
                                  ...block,
                                  id: crypto.randomUUID(),
                                })),
                              }));
                              field.pushValue({
                                id: crypto.randomUUID(),
                                dayNumber: nextDayNumber,
                                tasks: copiedTasks,
                              });
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </form.Field>
            </div>

            <FieldSeparator />

            {isEditMode ? (
              <form.Subscribe selector={(state) => state.isDefaultValue}>
                {(isDefaultValue) => (
                  <Field
                    orientation="horizontal"
                    className="grid grid-cols-2 gap-5"
                  >
                    <Button
                      type="submit"
                      disabled={isDefaultValue || isPending}
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                    {status === "draft" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={isPending}
                        onClick={handlePublish}
                      >
                        {isPublishing ? "Publishing..." : "Publish"}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={isPending}
                        onClick={onUnpublish}
                      >
                        {isUnpublishing ? "Unpublishing..." : "Unpublish"}
                      </Button>
                    )}
                  </Field>
                )}
              </form.Subscribe>
            ) : (
              <Field
                orientation="horizontal"
                className="grid grid-cols-2 gap-5"
              >
                <Button type="submit" disabled={isPending}>
                  {isSaving ? "Creating..." : "Create as Draft"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isPending}
                  onClick={handlePublish}
                >
                  {isPublishing ? "Publishing..." : "Create & Publish"}
                </Button>
              </Field>
            )}
          </FieldGroup>
        </form>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              Preview
            </h2>
            <Tabs
              value={previewLang}
              onValueChange={(value) => setPreviewLang(value as Language)}
            >
              <TabsList>
                <TabsTrigger value="en">EN</TabsTrigger>
                <TabsTrigger value="es">ES</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <form.Subscribe
            selector={(state) => ({
              nameEn: state.values.nameEn,
              nameEs: state.values.nameEs,
              overviews: state.values.overviews,
              days: state.values.days,
            })}
          >
            {({ nameEn, nameEs, overviews, days }) => (
              <ExperimentCard
                experiment={{
                  id: experimentId ?? "preview",
                  name: { en: nameEn, es: nameEs },
                  overviews: overviews.map((o) => ({
                    id: o.id,
                    title: { en: o.titleEn, es: o.titleEs },
                    thumbnail: o.thumbnail,
                    content: { en: o.contentEn, es: o.contentEs },
                  })),
                  days: days.map((d) => ({
                    id: d.id,
                    dayNumber: d.dayNumber,
                    tasks: d.tasks.map((t) => ({
                      id: t.id,
                      name: { en: t.nameEn, es: t.nameEs },
                      icon: t.icon,
                      blocks: t.blocks.map((b) => {
                        if (b.type === "markdown") {
                          return {
                            type: "markdown" as const,
                            id: b.id,
                            content: { en: b.contentEn, es: b.contentEs },
                          };
                        }
                        if (b.type === "text") {
                          return {
                            type: "text" as const,
                            id: b.id,
                            label: { en: b.labelEn, es: b.labelEs },
                            helpText: { en: b.helpTextEn, es: b.helpTextEs },
                            placeholder: {
                              en: b.placeholderEn,
                              es: b.placeholderEs,
                            },
                            required: b.required,
                          };
                        }
                        if (b.type === "number") {
                          return {
                            type: "number" as const,
                            id: b.id,
                            label: { en: b.labelEn, es: b.labelEs },
                            helpText: { en: b.helpTextEn, es: b.helpTextEs },
                            placeholder: {
                              en: b.placeholderEn,
                              es: b.placeholderEs,
                            },
                            required: b.required,
                          };
                        }
                        if (b.type === "slider") {
                          return {
                            type: "slider" as const,
                            id: b.id,
                            label: { en: b.labelEn, es: b.labelEs },
                            helpText: { en: b.helpTextEn, es: b.helpTextEs },
                            required: b.required,
                            min: b.min,
                            max: b.max,
                            step: b.step,
                            tickmarks: b.tickmarks,
                          };
                        }
                        // select
                        return {
                          type: "select" as const,
                          id: b.id,
                          label: { en: b.labelEn, es: b.labelEs },
                          helpText: { en: b.helpTextEn, es: b.helpTextEs },
                          required: b.required,
                          multiple: b.multiple,
                          options: b.options.map((opt) => ({
                            value: opt.value,
                            label: { en: opt.labelEn, es: opt.labelEs },
                          })),
                        };
                      }),
                    })),
                  })),
                }}
                language={previewLang}
              />
            )}
          </form.Subscribe>
        </div>
      </div>
    </div>
  );
}
