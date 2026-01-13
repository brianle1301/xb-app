import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-5 rounded-xl border py-5 shadow-sm relative",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@ /card-header flex items-start gap-4 px-5 [.border-b]:pb-5 relative",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeaderText({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header-text"
      className={cn("flex flex-col gap-1.5 flex-1", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export function CardAction({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "relative z-10 pointer-events-none [&_button]:pointer-events-auto [&_a]:pointer-events-auto",
        className,
      )}
      {...props}
    />
  );
}

export function CardLeadingAction({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-leading-action"
      className={cn(
        "relative z-10 pointer-events-none [&_button]:pointer-events-auto [&_a]:pointer-events-auto",
        className,
      )}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-5", className)}
      {...props}
    />
  );
}

export function CardFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-5 [.border-t]:pt-5", className)}
      {...props}
    />
  );
}

export function CardLink({
  className,
  asChild,
  ...props
}:
  | (React.ComponentProps<"a"> & { asChild?: false })
  | ({ asChild: true } & React.ComponentProps<typeof Slot>)) {
  const Comp = asChild ? Slot : "a";

  return (
    <Comp
      data-slot="card-link"
      className={cn(
        "absolute inset-0 z-10 rounded-xl",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      {...(props as any)}
    />
  );
}

export function CardHeaderTrigger({
  className,
  asChild,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="card-header-trigger"
      type="button"
      className={cn(
        "absolute inset-0 z-0 h-full w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    />
  );
}
