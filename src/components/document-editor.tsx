import React from "react";
import { useForm } from "@tanstack/react-form";

import { MarkdownEditor } from "@/components/markdown-editor";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Language } from "@/types/shared";

export interface DocumentFormValues {
  titleEn: string;
  titleEs: string;
  contentEn: string;
  contentEs: string;
}

export interface DocumentEditorProps {
  initialValues?: DocumentFormValues;
  status?: "draft" | "published";
  title: string;
  onSave: (values: DocumentFormValues) => void;
  onPublish?: (values: DocumentFormValues) => void;
  onUnpublish?: () => void;
  isSaving?: boolean;
  isPublishing?: boolean;
  isUnpublishing?: boolean;
}

const defaultValues: DocumentFormValues = {
  titleEn: "",
  titleEs: "",
  contentEn: "",
  contentEs: "",
};

export function DocumentEditor({
  initialValues,
  status,
  title,
  onSave,
  onPublish,
  onUnpublish,
  isSaving,
  isPublishing,
  isUnpublishing,
}: DocumentEditorProps) {
  const [previewLang, setPreviewLang] = React.useState<Language>("en");
  const [editLang, setEditLang] = React.useState<Language>("en");

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <div className="grid grid-cols-2 gap-5">
              <form.Field name="titleEn">
                {(field) => (
                  <Field>
                    <FieldLabel>Title (English)</FieldLabel>
                    <Input
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Enter title in English"
                    />
                  </Field>
                )}
              </form.Field>

              <form.Field name="titleEs">
                {(field) => (
                  <Field>
                    <FieldLabel>Title (Spanish)</FieldLabel>
                    <Input
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Enter title in Spanish"
                    />
                  </Field>
                )}
              </form.Field>
            </div>

            <Field>
              <div className="flex items-center justify-between mb-2">
                <FieldLabel className="mb-0">Content</FieldLabel>
                <Tabs
                  value={editLang}
                  onValueChange={(value) => setEditLang(value as Language)}
                >
                  <TabsList>
                    <TabsTrigger value="en">English</TabsTrigger>
                    <TabsTrigger value="es">Spanish</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              {editLang === "en" ? (
                <form.Field name="contentEn">
                  {(field) => (
                    <MarkdownEditor
                      value={field.state.value}
                      onChange={field.handleChange}
                      placeholder="Enter content in English..."
                      height={400}
                    />
                  )}
                </form.Field>
              ) : (
                <form.Field name="contentEs">
                  {(field) => (
                    <MarkdownEditor
                      value={field.state.value}
                      onChange={field.handleChange}
                      placeholder="Enter content in Spanish..."
                      height={400}
                    />
                  )}
                </form.Field>
              )}
            </Field>

            <FieldSeparator />

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
              titleEn: state.values.titleEn,
              titleEs: state.values.titleEs,
              contentEn: state.values.contentEn,
              contentEs: state.values.contentEs,
            })}
          >
            {({ titleEn, titleEs, contentEn, contentEs }) => (
              <div className="border rounded-lg p-6 bg-card">
                <h2 className="text-xl font-semibold mb-4">
                  {(previewLang === "en" ? titleEn : titleEs) || "(Untitled)"}
                </h2>
                <MarkdownRenderer
                  content={
                    (previewLang === "en" ? contentEn : contentEs) ||
                    "(No content)"
                  }
                />
              </div>
            )}
          </form.Subscribe>
        </div>
      </div>
    </div>
  );
}
