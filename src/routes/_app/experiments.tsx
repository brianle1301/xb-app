import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Badge } from "@/components/ui/badge";
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
import { getLocalized, useLanguage } from "@/lib/language-context";
import type { IBox, IExperiment, ITask } from "@/server/db/models";
import { listBoxes } from "@/server/rpc/boxes";
import { listExperimentsByBox } from "@/server/rpc/experiments";
import { getTask } from "@/server/rpc/tasks";

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
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);

  const { data: boxes } = useSuspenseQuery({
    queryKey: ["boxes"],
    queryFn: () => listBoxes(),
  });

  return (
    <div className="container max-w-screen-sm mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Experiments</h1>

      {!selectedBoxId ? (
        <div className="grid gap-4">
          {(boxes as unknown as IBox[])?.map((box) => (
            <Card
              key={box._id?.toString()}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedBoxId(box._id?.toString()!)}
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
        <BoxExperiments boxId={selectedBoxId} onBack={() => setSelectedBoxId(null)} />
      )}
    </div>
  );
}

function BoxExperiments({ boxId, onBack }: { boxId: string; onBack: () => void }) {
  const { language } = useLanguage();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [expandedExperimentId, setExpandedExperimentId] = useState<
    string | null
  >(null);

  const { data: experiments } = useSuspenseQuery({
    queryKey: ["experiments", boxId],
    queryFn: () => listExperimentsByBox({ data: boxId }),
  });

  const { data: selectedTask } = useSuspenseQuery({
    queryKey: ["task", selectedTaskId],
    queryFn: () => (selectedTaskId ? getTask({ data: selectedTaskId }) : null),
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
        {(experiments as unknown as IExperiment[])?.map((experiment) => {
          const isExpanded = expandedExperimentId === experiment._id?.toString();
          const dayCount = experiment.days.length;
          const firstDay = experiment.days[0];

          return (
            <Collapsible
              key={experiment._id?.toString()}
              open={isExpanded}
              onOpenChange={(open) =>
                setExpandedExperimentId(
                  open ? experiment._id?.toString()! : null,
                )
              }
            >
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div className="flex-1 text-left">
                      <h3 className="text-lg font-semibold">
                        {getLocalized(experiment.name, language)}
                      </h3>
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
                    <ExperimentTasks
                      experimentId={experiment._id?.toString()!}
                      taskIds={firstDay?.tasks.map((t) => t.toString()) || []}
                      onTaskClick={setSelectedTaskId}
                    />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      <Drawer
        open={!!selectedTaskId}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
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
                {selectedTask.blocks.map((block, index) => (
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

function ExperimentTasks({
  experimentId,
  taskIds,
  onTaskClick,
}: {
  experimentId: string;
  taskIds: string[];
  onTaskClick: (taskId: string) => void;
}) {
  const { language } = useLanguage();

  // Fetch all tasks for this experiment
  const taskQueries = taskIds.map((taskId) =>
    useSuspenseQuery({
      queryKey: ["task", taskId],
      queryFn: () => getTask({ data: taskId }),
    }),
  );

  const tasks = taskQueries.map((query) => query.data) as unknown as ITask[];

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <button
          key={task._id?.toString()}
          onClick={() => onTaskClick(task._id?.toString()!)}
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
  );
}
