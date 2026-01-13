import React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";

import { DataTable, DataTableColumnHeader } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { allUsersQuery } from "@/queries/admin/users";

export const Route = createFileRoute("/admin/users/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(allUsersQuery());
  },
  component: UsersPage,
});

type User = {
  id: string;
  name: string;
  email: string;
  role?: string;
  createdAt: Date;
};

const ch = createColumnHelper<User>();

function UsersPage() {
  const { data } = useSuspenseQuery(allUsersQuery());
  const users = data.users;
  const { user: currentUser } = Route.useRouteContext();

  const columns = React.useMemo(
    () => [
      ch.accessor("name", {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        cell: (info) => (
          <div className="flex items-center gap-2">
            <Link
              to="/admin/users/$userId"
              params={{ userId: info.row.original.id }}
              className="font-medium hover:underline"
            >
              {info.getValue()}
            </Link>
            {info.row.original.id === currentUser.id && (
              <Badge variant="secondary" className="text-xs">
                You
              </Badge>
            )}
          </div>
        ),
      }),
      ch.accessor("email", {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Email" />
        ),
      }),
      ch.accessor("role", {
        header: "Role",
        cell: (info) => (info.getValue() === "admin" ? "Admin" : "User"),
      }),
      ch.accessor("createdAt", {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Created" />
        ),
        cell: (info) => new Date(info.getValue()).toISOString().split("T")[0],
      }),
    ],
    [currentUser.id],
  );

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Users</h1>
      <DataTable columns={columns} data={users} />
    </div>
  );
}
