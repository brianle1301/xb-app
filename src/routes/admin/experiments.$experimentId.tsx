import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import {
  dayToFormValue,
  ExperimentEditor,
  type ExperimentFormValues,
  formValueToDay,
  formValueToOverview,
  overviewToFormValue,
} from "@/components/experiment-editor";
import { allBoxesQuery } from "@/queries/admin/boxes";
import {
  usePublishExperimentMutation,
  useUnpublishExperimentMutation,
  useUpdateExperimentMutation,
} from "@/queries/admin/experiments";
import { experimentDetailQuery } from "@/queries/experiments";

export const Route = createFileRoute("/admin/experiments/$experimentId")({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        experimentDetailQuery(params.experimentId),
      ),
      context.queryClient.ensureQueryData(allBoxesQuery()),
    ]);
  },
  component: EditExperimentPage,
});

function EditExperimentPage() {
  const { experimentId } = Route.useParams();
  const { data: experiment } = useSuspenseQuery(
    experimentDetailQuery(experimentId),
  );
  const { data: boxes } = useSuspenseQuery(allBoxesQuery());
  const updateMutation = useUpdateExperimentMutation();
  const publishMutation = usePublishExperimentMutation();
  const unpublishMutation = useUnpublishExperimentMutation();

  const handleSave = (values: ExperimentFormValues) => {
    updateMutation.mutate(
      {
        _id: experiment._id,
        name: { en: values.nameEn, es: values.nameEs },
        boxId: values.boxId || undefined,
        overviews: values.overviews.map(formValueToOverview),
        days: values.days.map(formValueToDay),
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

  const handlePublish = (values: ExperimentFormValues) => {
    updateMutation.mutate(
      {
        _id: experiment._id,
        name: { en: values.nameEn, es: values.nameEs },
        boxId: values.boxId || undefined,
        overviews: values.overviews.map(formValueToOverview),
        days: values.days.map(formValueToDay),
      },
      {
        onSuccess: () => {
          publishMutation.mutate(experiment._id, {
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
    unpublishMutation.mutate(experiment._id, {
      onSuccess: () => {
        toast.success("Unpublished");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <ExperimentEditor
        title={`Edit ${experiment.name.en || "(Untitled)"}`}
        experimentId={experiment._id}
        initialValues={{
          nameEn: experiment.name.en,
          nameEs: experiment.name.es,
          boxId: experiment.boxId ?? "",
          overviews: (experiment.overviews ?? []).map(overviewToFormValue),
          days: experiment.days.map(dayToFormValue),
        }}
        status={experiment.status}
        boxes={boxes}
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
