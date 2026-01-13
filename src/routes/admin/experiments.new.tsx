import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import {
  ExperimentEditor,
  type ExperimentFormValues,
  formValueToDay,
  formValueToOverview,
} from "@/components/experiment-editor";
import { allBoxesQuery } from "@/queries/admin/boxes";
import {
  useCreateExperimentMutation,
  usePublishExperimentMutation,
} from "@/queries/admin/experiments";

export const Route = createFileRoute("/admin/experiments/new")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(allBoxesQuery());
  },
  component: NewExperimentPage,
});

function NewExperimentPage() {
  const navigate = useNavigate();
  const { data: boxes } = useSuspenseQuery(allBoxesQuery());
  const createMutation = useCreateExperimentMutation();
  const publishMutation = usePublishExperimentMutation();

  const handleSave = (values: ExperimentFormValues) => {
    createMutation.mutate(
      {
        name: { en: values.nameEn, es: values.nameEs },
        boxId: values.boxId || undefined,
        overviews: values.overviews.map(formValueToOverview),
        days: values.days.map(formValueToDay),
      },
      {
        onSuccess: (experiment) => {
          toast.success("Experiment created");
          navigate({
            to: "/admin/experiments/$experimentId",
            params: { experimentId: experiment._id },
            replace: true,
          });
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  };

  const handlePublish = (values: ExperimentFormValues) => {
    createMutation.mutate(
      {
        name: { en: values.nameEn, es: values.nameEs },
        boxId: values.boxId || undefined,
        overviews: values.overviews.map(formValueToOverview),
        days: values.days.map(formValueToDay),
      },
      {
        onSuccess: (experiment) => {
          publishMutation.mutate(experiment._id, {
            onSuccess: () => {
              toast.success("Experiment created and published");
              navigate({
                to: "/admin/experiments/$experimentId",
                params: { experimentId: experiment._id },
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
    <div className="w-full max-w-6xl mx-auto p-6">
      <ExperimentEditor
        title="New Experiment"
        boxes={boxes}
        onSave={handleSave}
        onPublish={handlePublish}
        isSaving={createMutation.isPending}
        isPublishing={publishMutation.isPending}
      />
    </div>
  );
}
