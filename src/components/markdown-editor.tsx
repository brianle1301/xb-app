import MDEditor, { commands, type ICommand } from "@uiw/react-md-editor";
import {
  ChevronDown,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Video,
} from "lucide-react";

import { useTheme } from "@/lib/theme-context";

import { MarkdownRenderer } from "./markdown-renderer";

// Custom heading commands with lucide icons
const heading1Command: ICommand = {
  ...commands.heading1,
  icon: <Heading1 className="size-3" />,
};
const heading2Command: ICommand = {
  ...commands.heading2,
  icon: <Heading2 className="size-3" />,
};
const heading3Command: ICommand = {
  ...commands.heading3,
  icon: <Heading3 className="size-3" />,
};
const heading4Command: ICommand = {
  ...commands.heading4,
  icon: <Heading4 className="size-3" />,
};

// Custom accordion command
const accordionCommand: ICommand = {
  name: "accordion",
  keyCommand: "accordion",
  buttonProps: { "aria-label": "Insert accordion" },
  icon: <ChevronDown className="size-3" />,
  execute: (state, api) => {
    const content = state.selectedText || "Accordion content goes here...";
    const newText = `<details>\n<summary>Accordion title</summary>\n\n${content}\n\n</details>`;
    api.replaceSelection(newText);
  },
};

// Custom video command (YouTube embed via image syntax)
const videoCommand: ICommand = {
  name: "video",
  keyCommand: "video",
  buttonProps: { "aria-label": "Insert YouTube video" },
  icon: <Video className="size-3" />,
  execute: (state, api) => {
    const url = state.selectedText || "https://youtube.com/watch?v=";
    const newText = `![video](${url})`;
    api.replaceSelection(newText);
  },
};

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  height = 300,
}: MarkdownEditorProps) {
  const { resolvedTheme } = useTheme();

  return (
    <div
      data-color-mode={resolvedTheme}
      className="[&_.w-md-editor]:border-input [&_.w-md-editor-toolbar]:border-input"
    >
      <MDEditor
        value={value}
        onChange={(val) => onChange(val ?? "")}
        preview="live"
        height={height}
        textareaProps={{
          placeholder,
        }}
        commands={[
          commands.bold,
          commands.italic,
          commands.divider,
          heading1Command,
          heading2Command,
          heading3Command,
          heading4Command,
          commands.divider,
          commands.link,
          commands.image,
          videoCommand,
          commands.divider,
          commands.unorderedListCommand,
          commands.orderedListCommand,
          commands.divider,
          accordionCommand,
        ]}
        components={{
          preview: (source) => <MarkdownRenderer content={source ?? ""} />,
        }}
      />
    </div>
  );
}
