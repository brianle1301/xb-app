import React from "react";
import { useForm } from "@tanstack/react-form";

import { BoxCard } from "@/components/box-card";
import { IconPicker } from "@/components/icon-picker";
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
import { Textarea } from "@/components/ui/textarea";
import type { Language } from "@/types/shared";

export interface BoxFormValues {
  nameEn: string;
  nameEs: string;
  descriptionEn: string;
  descriptionEs: string;
  icon: string;
  thumbnail: string;
}

export interface BoxEditorProps {
  // Initial values (for edit mode)
  initialValues?: BoxFormValues;
  // Status (for edit mode)
  status?: "draft" | "published";
  // Title to display
  title: string;
  // Callbacks
  onSave: (values: BoxFormValues) => void;
  onPublish?: (values: BoxFormValues) => void;
  onUnpublish?: () => void;
  // Loading states
  isSaving?: boolean;
  isPublishing?: boolean;
  isUnpublishing?: boolean;
}

const defaultValues: BoxFormValues = {
  nameEn: "",
  nameEs: "",
  descriptionEn: "",
  descriptionEs: "",
  icon: "box",
  thumbnail: "",
};

export function BoxEditor({
  initialValues,
  status,
  title,
  onSave,
  onPublish,
  onUnpublish,
  isSaving,
  isPublishing,
  isUnpublishing,
}: BoxEditorProps) {
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <div className="grid grid-cols-2 gap-5">
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
            </div>

            <form.Field name="descriptionEn">
              {(field) => (
                <Field>
                  <FieldLabel>Description (English)</FieldLabel>
                  <Textarea
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Enter description in English"
                    className="min-h-24"
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="descriptionEs">
              {(field) => (
                <Field>
                  <FieldLabel>Description (Spanish)</FieldLabel>
                  <Textarea
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Enter description in Spanish"
                    className="min-h-24"
                  />
                </Field>
              )}
            </form.Field>

            <div className="grid grid-cols-2 gap-5">
              <form.Field name="icon">
                {(field) => (
                  <Field>
                    <FieldLabel>Icon</FieldLabel>
                    <IconPicker
                      value={field.state.value}
                      onChange={field.handleChange}
                    />
                  </Field>
                )}
              </form.Field>

              <form.Field name="thumbnail">
                {(field) => (
                  <Field>
                    <FieldLabel>Thumbnail URL</FieldLabel>
                    <Input
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="https://example.com/image.jpg"
                    />
                  </Field>
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
              descriptionEn: state.values.descriptionEn,
              descriptionEs: state.values.descriptionEs,
              thumbnail: state.values.thumbnail,
            })}
          >
            {({ nameEn, nameEs, descriptionEn, descriptionEs, thumbnail }) => (
              <BoxCard
                name={(previewLang === "en" ? nameEn : nameEs) || "(Untitled)"}
                description={
                  (previewLang === "en" ? descriptionEn : descriptionEs) ||
                  "(No description)"
                }
                thumbnail={thumbnail}
              />
            )}
          </form.Subscribe>
        </div>
      </div>
    </div>
  );
}
