import { ImageIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface ThumbnailProps {
  src?: string;
  className?: string;
}

export function Thumbnail({ src, className }: ThumbnailProps) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={cn("rounded-lg object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "rounded-lg bg-muted flex items-center justify-center",
        className,
      )}
    >
      <ImageIcon className="size-4 text-muted-foreground" />
    </div>
  );
}
