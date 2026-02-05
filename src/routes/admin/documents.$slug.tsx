import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import {
  DocumentEditor,
  type DocumentFormValues,
} from "@/components/document-editor";
import {
  documentBySlugQuery,
  usePublishDocumentMutation,
  useUnpublishDocumentMutation,
  useUpdateDocumentMutation,
} from "@/queries/admin/documents";
import { DOCUMENT_SLUGS } from "@/server/rpc/documents";

export const Route = createFileRoute("/admin/documents/$slug")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(documentBySlugQuery(params.slug));
  },
  component: EditDocumentPage,
});

function EditDocumentPage() {
  const { slug } = Route.useParams();
  const { data: doc } = useSuspenseQuery(documentBySlugQuery(slug));
  const updateMutation = useUpdateDocumentMutation();
  const publishMutation = usePublishDocumentMutation();
  const unpublishMutation = useUnpublishDocumentMutation();

  const slugInfo = DOCUMENT_SLUGS.find((s) => s.slug === slug);

  const handleSave = (values: DocumentFormValues) => {
    updateMutation.mutate(
      {
        slug,
        title: { en: values.titleEn, es: values.titleEs },
        content: { en: values.contentEn, es: values.contentEs },
      },
      {
        onSuccess: () => {
          toast.success("Changes saved");
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  };

  const handlePublish = (values: DocumentFormValues) => {
    updateMutation.mutate(
      {
        slug,
        title: { en: values.titleEn, es: values.titleEs },
        content: { en: values.contentEn, es: values.contentEs },
      },
      {
        onSuccess: () => {
          publishMutation.mutate(slug, {
            onSuccess: () => {
              toast.success("Published");
            },
            onError: (error) => {
              toast.error(error.message);
            },
          });
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  };

  const handleUnpublish = () => {
    unpublishMutation.mutate(slug, {
      onSuccess: () => {
        toast.success("Unpublished");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto w-full">
      <DocumentEditor
        title={slugInfo?.name ?? slug}
        initialValues={{
          titleEn: doc.title.en,
          titleEs: doc.title.es,
          contentEn: doc.content.en,
          contentEs: doc.content.es,
        }}
        status={doc.status}
        onSave={handleSave}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
        isSaving={updateMutation.isPending}
        isPublishing={publishMutation.isPending}
        isUnpublishing={unpublishMutation.isPending}
      />
    </div>
  );
}
