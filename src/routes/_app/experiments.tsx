import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { BoxCard } from "@/components/box-card";
import { CardLink } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { getLocalized, useLanguage } from "@/lib/language-context";
import { publishedBoxesQuery } from "@/queries/boxes";

export const Route = createFileRoute("/_app/experiments")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(publishedBoxesQuery());
  },
  component: ExperimentsPage,
  pendingComponent: () => (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner />
    </div>
  ),
});

function ExperimentsPage() {
  const { language } = useLanguage();
  const { data: boxes } = useSuspenseQuery(publishedBoxesQuery());

  return (
    <div className="container max-w-screen-sm mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Labs</h1>

      <div className="grid gap-4">
        {boxes?.map((box) => (
          <BoxCard
            key={box.id}
            name={getLocalized(box.name, language)}
            description={getLocalized(box.description, language)}
            thumbnail={box.thumbnail}
          >
            <CardLink asChild>
              <Link to="/boxes/$boxId/experiments" params={{ boxId: box.id }} />
            </CardLink>
          </BoxCard>
        ))}
      </div>
    </div>
  );
}
