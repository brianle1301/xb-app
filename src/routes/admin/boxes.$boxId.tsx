import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { BoxEditor, type BoxFormValues } from "@/components/box-editor";
import {
  usePublishBoxMutation,
  useUnpublishBoxMutation,
  useUpdateBoxMutation,
} from "@/queries/admin/boxes";
import { boxDetailQuery } from "@/queries/boxes";

export const Route = createFileRoute("/admin/boxes/$boxId")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(boxDetailQuery(params.boxId));
  },
  component: EditBoxPage,
});

function EditBoxPage() {
  const { boxId } = Route.useParams();
  const { data: box } = useSuspenseQuery(boxDetailQuery(boxId));
  const updateMutation = useUpdateBoxMutation();
  const publishMutation = usePublishBoxMutation();
  const unpublishMutation = useUnpublishBoxMutation();

  const handleSave = (values: BoxFormValues) => {
    updateMutation.mutate(
      {
        _id: box._id,
        name: { en: values.nameEn, es: values.nameEs },
        description: { en: values.descriptionEn, es: values.descriptionEs },
        icon: values.icon,
        thumbnail: values.thumbnail,
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

  const handlePublish = (values: BoxFormValues) => {
    // First save, then publish
    updateMutation.mutate(
      {
        _id: box._id,
        name: { en: values.nameEn, es: values.nameEs },
        description: { en: values.descriptionEn, es: values.descriptionEs },
        icon: values.icon,
        thumbnail: values.thumbnail,
      },
      {
        onSuccess: () => {
          publishMutation.mutate(box._id, {
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
    unpublishMutation.mutate(box._id, {
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
      <BoxEditor
        title={`Edit ${box.name.en || "(Untitled)"}`}
        initialValues={{
          nameEn: box.name.en,
          nameEs: box.name.es,
          descriptionEn: box.description.en,
          descriptionEs: box.description.es,
          icon: box.icon,
          thumbnail: box.thumbnail,
        }}
        status={box.status}
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
