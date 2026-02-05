import React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";

import { DataTable, DataTableColumnHeader } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { allDocumentsQuery } from "@/queries/admin/documents";
import type { DocumentInfo } from "@/server/rpc/documents";

export const Route = createFileRoute("/admin/documents/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(allDocumentsQuery());
  },
  component: DocumentsPage,
});

const ch = createColumnHelper<DocumentInfo>();

function DocumentsPage() {
  const { data: documents } = useSuspenseQuery(allDocumentsQuery());

  const columns = React.useMemo(
    () => [
      ch.accessor("name", {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        cell: ({ row }) => (
          <Link
            to="/admin/documents/$slug"
            params={{ slug: row.original.slug }}
            className="font-medium hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      }),
      ch.accessor("description", {
        header: "Description",
        cell: (info) => (
          <span className="text-muted-foreground">{info.getValue()}</span>
        ),
        enableSorting: false,
      }),
      ch.accessor((row) => row.document?.status, {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.document?.status ?? "draft";
          return (
            <Badge variant={status === "published" ? "default" : "secondary"}>
              {status}
            </Badge>
          );
        },
        enableSorting: false,
      }),
      ch.accessor((row) => row.document?.updatedAt, {
        id: "updatedAt",
        header: "Updated",
        cell: ({ row }) => {
          const updatedAt = row.original.document?.updatedAt;
          if (!updatedAt) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="text-muted-foreground text-sm">
              {new Date(updatedAt).toLocaleDateString()}
            </span>
          );
        },
        enableSorting: false,
      }),
    ],
    [],
  );

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Documents</h1>
      </div>
      <DataTable columns={columns} data={documents} />
    </div>
  );
}
