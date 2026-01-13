import MDEditor, { commands } from "@uiw/react-md-editor";

import { useTheme } from "@/lib/theme-context";

import { MarkdownRenderer } from "./markdown-renderer";

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
          commands.link,
          commands.image,
          commands.divider,
          commands.unorderedListCommand,
          commands.orderedListCommand,
        ]}
        components={{
          preview: (source) => <MarkdownRenderer content={source ?? ""} />,
        }}
      />
    </div>
  );
}
