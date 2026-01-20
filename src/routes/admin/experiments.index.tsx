import React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable, DataTableColumnHeader } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  allExperimentsQuery,
  useDeleteExperimentMutation,
} from "@/queries/admin/experiments";
import type { ExperimentWithBox } from "@/server/rpc/experiments";

export const Route = createFileRoute("/admin/experiments/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(allExperimentsQuery());
  },
  component: ExperimentsPage,
});

const ch = createColumnHelper<ExperimentWithBox>();

function DeleteExperimentDialog({
  experiment,
}: {
  experiment: ExperimentWithBox;
}) {
  const deleteMutation = useDeleteExperimentMutation();
  const [open, setOpen] = React.useState(false);

  const handleDelete = () => {
    deleteMutation.mutate(experiment.id, {
      onSuccess: () => {
        toast.success("Experiment deleted");
        setOpen(false);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Experiment</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "
            {experiment.name.en || "(Untitled)"}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExperimentsPage() {
  const { data: experiments } = useSuspenseQuery(allExperimentsQuery());

  const columns = React.useMemo(
    () => [
      ch.accessor((row) => row.name.en, {
        id: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        cell: ({ row }) => (
          <Link
            to="/admin/experiments/$experimentId"
            params={{ experimentId: row.original.id }}
            className="font-medium hover:underline"
          >
            {row.original.name.en || "(Untitled)"}
          </Link>
        ),
      }),
      ch.accessor((row) => row.box?.name.en, {
        id: "box",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Box" />
        ),
      }),
      ch.accessor("status", {
        header: "Status",
        cell: (info) => (
          <Badge
            variant={info.getValue() === "published" ? "default" : "secondary"}
          >
            {info.getValue()}
          </Badge>
        ),
        enableSorting: false,
      }),
      ch.display({
        id: "actions",
        header: "",
        cell: ({ row }) => <DeleteExperimentDialog experiment={row.original} />,
      }),
    ],
    [],
  );

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Experiments</h1>
        <Button asChild>
          <Link to="/admin/experiments/new">
            <Plus className="size-4" />
            New Experiment
          </Link>
        </Button>
      </div>
      <DataTable columns={columns} data={experiments} />
    </div>
  );
}
