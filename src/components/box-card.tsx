import React from "react";
import { ChevronRight } from "lucide-react";

import { Thumbnail } from "@/components/thumbnail";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardHeaderText,
  CardLeadingAction,
  CardTitle,
} from "@/components/ui/card";

interface BoxCardProps {
  name: string;
  description: string;
  thumbnail?: string;
  children?: React.ReactNode;
}

export function BoxCard({
  name,
  description,
  thumbnail,
  children,
}: BoxCardProps) {
  return (
    <Card>
      {children}
      <CardHeader>
        <CardLeadingAction>
          <Thumbnail src={thumbnail} className="size-14" />
        </CardLeadingAction>

        <CardHeaderText>
          <CardTitle>{name || "(Untitled)"}</CardTitle>
          <CardDescription>{description || "(No description)"}</CardDescription>
        </CardHeaderText>
        <CardAction>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </CardAction>
      </CardHeader>
    </Card>
  );
}
