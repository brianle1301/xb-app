import {
  createFileRoute,
  Link,
  notFound,
  Outlet,
} from "@tanstack/react-router";
import { Box, FileText, FlaskConical, Users } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { getSession } from "@/server/rpc/auth";

const navItems = [
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Boxes", url: "/admin/boxes", icon: Box },
  { title: "Experiments", url: "/admin/experiments", icon: FlaskConical },
  { title: "Documents", url: "/admin/documents", icon: FileText },
];

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const session = await getSession();

    // Show 404 for both unauthenticated users and non-admins
    // This provides security through obscurity
    if (!session || session.user.role !== "admin") {
      throw notFound();
    }

    return { user: session.user };
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader>
          <span className="text-lg font-semibold px-2">Admin</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
