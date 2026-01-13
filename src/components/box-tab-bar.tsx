import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { getLocalized, useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import { publishedBoxesQuery } from "@/queries/boxes";

interface BoxTabBarProps {
  currentBoxId: string;
}

export function BoxTabBar({ currentBoxId }: BoxTabBarProps) {
  const { language } = useLanguage();

  const { data: boxes } = useSuspenseQuery(publishedBoxesQuery());

  return (
    <nav className="border-b border-border">
      <div className="flex">
        {boxes?.map((box) => {
          const isActive = currentBoxId === box._id;

          return (
            <Link
              key={box._id}
              to="/boxes/$boxId/experiments"
              params={{ boxId: box._id }}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm transition-colors border-b-2 -mb-px",
                isActive
                  ? "text-primary font-medium border-primary"
                  : "text-muted-foreground hover:text-foreground border-transparent",
              )}
            >
              <DynamicIcon name={box.icon} className="w-4 h-4" />
              <span>{getLocalized(box.name, language)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
