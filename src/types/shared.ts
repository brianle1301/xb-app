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

export interface TextBlock {
  type: "text";
  id: string;
  label: LocalizedText;
  helpText?: LocalizedText;
  required?: boolean;
  placeholder?: LocalizedText;
}

export interface NumberBlock {
  type: "number";
  id: string;
  label: LocalizedText;
  helpText?: LocalizedText;
  required?: boolean;
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

export type Block = MarkdownBlock | TextBlock | NumberBlock | SelectBlock;

// Helper type for blocks that collect user input
export type InputBlock = TextBlock | NumberBlock | SelectBlock;

// Content-only block (no inputs) for overviews
export type ContentBlock = MarkdownBlock;

// ============ Overview ============

export interface Overview {
  _id: string;
  title: LocalizedText;
  thumbnail: string;
  blocks?: ContentBlock[];
}

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
