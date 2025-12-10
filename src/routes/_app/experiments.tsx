import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { Card, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { getLocalized, useLanguage } from "@/lib/language-context";
import { listBoxes } from "@/server/rpc/boxes";

export const Route = createFileRoute("/_app/experiments")({
  component: ExperimentsPage,
  pendingComponent: () => (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner />
    </div>
  ),
});

function ExperimentsPage() {
  const { language } = useLanguage();

  const { data: boxes } = useSuspenseQuery({
    queryKey: ["boxes"],
    queryFn: () => listBoxes(),
  });

  return (
    <div className="container max-w-screen-sm mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Experiments</h1>

      <div className="grid gap-4">
        {boxes?.map((box) => (
          <Link
            key={box._id}
            to="/boxes/$boxId/experiments"
            params={{ boxId: box._id }}
          >
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start gap-4">
                  {box.thumbnail?.startsWith("http") ? (
                    <img
                      src={box.thumbnail}
                      alt={getLocalized(box.name, language)}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="text-5xl">{box.thumbnail}</span>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">
                      {getLocalized(box.name, language)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {getLocalized(box.description, language)}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground mt-1" />
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
