import { Link, useRouterState } from "@tanstack/react-router";
import {
  Calendar,
  FlaskConical,
  Settings,
  Sun,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  {
    to: "/today",
    label: "Today",
    icon: Sun,
  },
  {
    to: "/experiments",
    label: "Labs",
    icon: FlaskConical,
  },
  {
    to: "/journal",
    label: "Log",
    icon: Calendar,
  },
  {
    to: "/settings",
    label: "Settings",
    icon: Settings,
  },
];

export function MobileNav() {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  return (
    <nav className="bg-background border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-16 max-w-screen-sm mx-auto">
        {navItems.map((item) => {
          const isActive = currentPath.startsWith(item.to);
          const Icon = item.icon;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 text-xs transition-colors",
                isActive
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
