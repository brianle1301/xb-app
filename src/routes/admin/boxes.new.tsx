import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { BoxEditor, type BoxFormValues } from "@/components/box-editor";
import {
  useCreateBoxMutation,
  usePublishBoxMutation,
} from "@/queries/admin/boxes";

export const Route = createFileRoute("/admin/boxes/new")({
  component: NewBoxPage,
});

function NewBoxPage() {
  const navigate = useNavigate();
  const createMutation = useCreateBoxMutation();
  const publishMutation = usePublishBoxMutation();

  const handleSave = (values: BoxFormValues) => {
    createMutation.mutate(
      {
        name: { en: values.nameEn, es: values.nameEs },
        description: { en: values.descriptionEn, es: values.descriptionEs },
        icon: values.icon,
        thumbnail: values.thumbnail,
      },
      {
        onSuccess: (box) => {
          toast.success("Box created");
          navigate({
            to: "/admin/boxes/$boxId",
            params: { boxId: box._id },
            replace: true,
          });
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  };

  const handlePublish = (values: BoxFormValues) => {
    createMutation.mutate(
      {
        name: { en: values.nameEn, es: values.nameEs },
        description: { en: values.descriptionEn, es: values.descriptionEs },
        icon: values.icon,
        thumbnail: values.thumbnail,
      },
      {
        onSuccess: (box) => {
          publishMutation.mutate(box._id, {
            onSuccess: () => {
              toast.success("Box created and published");
              navigate({
                to: "/admin/boxes/$boxId",
                params: { boxId: box._id },
                replace: true,
              });
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

  return (
    <div className="p-6 max-w-6xl mx-auto w-full">
      <BoxEditor
        title="New Box"
        onSave={handleSave}
        onPublish={handlePublish}
        isSaving={createMutation.isPending}
        isPublishing={publishMutation.isPending}
      />
    </div>
  );
}
