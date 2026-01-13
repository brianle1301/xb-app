import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { BoxTabBar } from "@/components/box-tab-bar";

export const Route = createFileRoute("/_app/boxes/$boxId")({
  component: BoxLayout,
});

function BoxLayout() {
  const { boxId } = Route.useParams();

  return (
    <div className="w-full max-w-screen-sm mx-auto px-4 py-6">
      <Link
        to="/experiments"
        className="flex items-center gap-2 text-primary mb-4 hover:underline"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        Back to boxes
      </Link>
      <BoxTabBar currentBoxId={boxId} />
      <Outlet />
    </div>
  );
}
