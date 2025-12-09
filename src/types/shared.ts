/**
 * Shared types used across multiple RPC files.
 * Entity-specific types are co-located with their RPC files.
 */

// Supported languages
export type Language = "en" | "es";

// Localized text (always has both languages)
export interface LocalizedText {
  en: string;
  es: string;
}

// Optional localized text (for fields like helpText, placeholder)
export interface OptionalLocalizedText {
  en?: string;
  es?: string;
}

// ============ Block Types ============

export interface SelectOption {
  value: string;
  label: LocalizedText;
}

export interface MarkdownBlock {
  type: "markdown";
  content: OptionalLocalizedText;
}

export interface InputBlock {
  type: "input";
  id: string;
  label: LocalizedText;
  helpText?: LocalizedText;
  required?: boolean;
  inputType?: "text" | "number" | "textarea";
  placeholder?: LocalizedText;
}

export interface SelectBlock {
  type: "select";
  id: string;
  label: LocalizedText;
  helpText?: LocalizedText;
  required?: boolean;
  options: SelectOption[];
}

export type Block = MarkdownBlock | InputBlock | SelectBlock;

// ============ Task ============

export interface Task {
  _id: string;
  name: LocalizedText;
  icon: string;
  blocks?: Block[];
}

// ============ Experiment Day ============

export interface ExperimentDay {
  dayNumber: number;
  tasks: Task[];
}
