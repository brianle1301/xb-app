import React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable, DataTableColumnHeader } from "@/components/data-table";
import { Thumbnail } from "@/components/thumbnail";
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
import { allBoxesQuery, useDeleteBoxMutation } from "@/queries/admin/boxes";
import type { Box } from "@/server/rpc/boxes";

export const Route = createFileRoute("/admin/boxes/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(allBoxesQuery());
  },
  component: BoxesPage,
});

const ch = createColumnHelper<Box>();

function DeleteBoxDialog({ box }: { box: Box }) {
  const deleteMutation = useDeleteBoxMutation();
  const [open, setOpen] = React.useState(false);

  const handleDelete = () => {
    deleteMutation.mutate(box._id, {
      onSuccess: () => {
        toast.success("Box deleted");
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
          <DialogTitle>Delete Box</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{box.name.en || "(Untitled)"}"?
            This action cannot be undone.
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

function BoxesPage() {
  const { data: boxes } = useSuspenseQuery(allBoxesQuery());

  const columns = React.useMemo(
    () => [
      ch.accessor("thumbnail", {
        header: "",
        cell: (info) => (
          <Thumbnail src={info.getValue()} className="size-10" />
        ),
        enableSorting: false,
      }),
      ch.accessor((row) => row.name.en, {
        id: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        cell: ({ row }) => (
          <Link
            to="/admin/boxes/$boxId"
            params={{ boxId: row.original._id }}
            className="font-medium hover:underline"
          >
            {row.original.name.en || "(Untitled)"}
          </Link>
        ),
      }),
      ch.accessor((row) => row.description.en, {
        id: "description",
        header: "Description",
        cell: (info) => (
          <div className="text-muted-foreground max-w-sm truncate">
            {info.getValue() || "(No description)"}
          </div>
        ),
        enableSorting: false,
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
        cell: ({ row }) => <DeleteBoxDialog box={row.original} />,
      }),
    ],
    [],
  );

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Boxes</h1>
        <Button asChild>
          <Link to="/admin/boxes/new">
            <Plus className="size-4" />
            New Box
          </Link>
        </Button>
      </div>
      <DataTable columns={columns} data={boxes} />
    </div>
  );
}
