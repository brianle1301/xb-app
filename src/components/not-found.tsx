import { Link } from "@tanstack/react-router";
import { FileQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Empty className="border-none">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileQuestion className="size-5" />
          </EmptyMedia>
          <EmptyTitle>Page Not Found</EmptyTitle>
          <EmptyDescription>
            The page you're looking for doesn't exist.
          </EmptyDescription>
        </EmptyHeader>
        <Button asChild>
          <Link to="/today">Go Home</Link>
        </Button>
      </Empty>
    </div>
  );
}
