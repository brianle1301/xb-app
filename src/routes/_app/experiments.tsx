import { useState } from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Play } from "lucide-react";

import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth-context";
import { getLocalized, useLanguage } from "@/lib/language-context";
import { listBoxes } from "@/server/rpc/boxes";
import { listExperimentsByBox } from "@/server/rpc/experiments";
import {
  getUserSubscriptions,
  startSubscription,
} from "@/server/rpc/subscriptions";

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
  const { user } = useAuth();
  const userId = user!.id;
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);

  const { data: boxes } = useSuspenseQuery({
    queryKey: ["boxes"],
    queryFn: () => listBoxes(),
  });

  const { data: subscriptions } = useSuspenseQuery({
    queryKey: ["subscriptions", userId],
    queryFn: () => getUserSubscriptions({ data: userId }),
  });

  // Create a map for quick lookup
  const subscriptionMap = new Map<string, (typeof subscriptions)[number]>();
  subscriptions?.forEach((sub) => {
    if (sub && sub.experimentId) {
      const experimentId =
        typeof sub.experimentId === "object"
          ? (sub.experimentId as any)._id
          : sub.experimentId;
      if (experimentId) {
        subscriptionMap.set(experimentId, sub);
      }
    }
  });

  return (
    <div className="container max-w-screen-sm mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Experiments</h1>

      {!selectedBoxId ? (
        <div className="grid gap-4">
          {boxes?.map((box) => (
            <Card
              key={box._id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedBoxId(box._id)}
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <span className="text-5xl">{box.thumbnail}</span>
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
          ))}
        </div>
      ) : (
        <BoxExperiments
          boxId={selectedBoxId}
          subscriptionMap={subscriptionMap}
          onBack={() => setSelectedBoxId(null)}
        />
      )}
    </div>
  );
}

function BoxExperiments({
  boxId,
  subscriptionMap,
  onBack,
}: {
  boxId: string;
  subscriptionMap: Map<string, any>;
  onBack: () => void;
}) {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [expandedExperimentId, setExpandedExperimentId] = useState<
    string | null
  >(null);

  const { data: experiments } = useSuspenseQuery({
    queryKey: ["experiments", boxId],
    queryFn: () => listExperimentsByBox({ data: boxId }),
  });

  const startMutation = useMutation({
    mutationFn: (subscriptionId: string) =>
      startSubscription({ data: { subscriptionId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["today-tasks"] });
    },
  });

  return (
    <>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-primary mb-4 hover:underline"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        Back to boxes
      </button>

      <div className="space-y-3">
        {experiments?.map((experiment) => {
          const experimentId = experiment._id;
          const subscription = subscriptionMap.get(experimentId);
          const isExpanded = expandedExperimentId === experimentId;
          const dayCount = experiment.days?.length ?? 0;
          const firstDayTasks = experiment.days?.[0]?.tasks ?? [];

          const status = subscription?.status;
          const currentDay = subscription?.currentDay;

          return (
            <Collapsible
              key={experimentId}
              open={isExpanded}
              onOpenChange={(open) =>
                setExpandedExperimentId(open ? experimentId : null)
              }
            >
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold">
                          {getLocalized(experiment.name, language)}
                        </h3>
                        {status === "started" && currentDay && (
                          <Badge variant="default">
                            Day {currentDay}/{dayCount}
                          </Badge>
                        )}
                        {status === "offered" && (
                          <Badge variant="secondary">New</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {dayCount} {dayCount === 1 ? "day" : "days"}
                      </p>
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 text-muted-foreground transition-transform ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground mb-4">
                      {getLocalized(experiment.description, language)}
                    </p>

                    {status === "offered" && subscription && (
                      <Button
                        className="w-full mb-4"
                        onClick={(e) => {
                          e.stopPropagation();
                          startMutation.mutate(subscription._id);
                        }}
                        disabled={startMutation.isPending}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {startMutation.isPending
                          ? "Starting..."
                          : "Start Experiment"}
                      </Button>
                    )}

                    {status === "started" && (
                      <div className="mb-4 p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">
                          Currently on Day {currentDay} of {dayCount}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Check the Today tab for your daily tasks
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground mb-2">
                      Day 1 Preview:
                    </p>
                    <div className="space-y-2">
                      {firstDayTasks.map((task: any) => (
                        <button
                          key={task._id}
                          onClick={() => setSelectedTask(task)}
                          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{task.icon}</span>
                            <span className="font-medium">
                              {getLocalized(task.name, language)}
                            </span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      <Drawer
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
      >
        <DrawerContent className="max-h-[85vh] overflow-y-auto">
          {selectedTask && (
            <>
              <DrawerHeader>
                <DrawerTitle className="flex items-center gap-2">
                  <span className="text-2xl">{selectedTask.icon}</span>
                  <span>{getLocalized(selectedTask.name, language)}</span>
                </DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-8">
                {selectedTask.blocks?.map((block: any, index: number) => (
                  <MarkdownRenderer
                    key={index}
                    content={getLocalized(block.content, language)}
                  />
                ))}
              </div>
              <div className="sticky bottom-0 p-4 border-t bg-background">
                <DrawerClose className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium">
                  Close
                </DrawerClose>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
