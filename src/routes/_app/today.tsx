import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getTodayTasks } from "@/server/rpc/experiments";
import { getTask } from "@/server/rpc/tasks";

export const Route = createFileRoute("/_app/today")({
  component: TodayPage,
  pendingComponent: () => (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner />
    </div>
  ),
});

function TodayPage() {
  const { language } = useLanguage();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { data: todayData } = useSuspenseQuery({
    queryKey: ["today-tasks"],
    queryFn: () => getTodayTasks(),
  });

  const { data: selectedTask } = useSuspenseQuery({
    queryKey: ["task", selectedTaskId],
    queryFn: () => (selectedTaskId ? getTask({ data: selectedTaskId }) : null),
  });

  const filteredTodayData = todayData?.filter((group) => group !== null) || [];

  return (
    <div className="container max-w-screen-sm mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Today</h1>

      {filteredTodayData.length === 0 && (
        <p className="text-muted-foreground text-center py-12">
          No tasks for today. Check the Experiments tab to start one!
        </p>
      )}

      <div className="space-y-6">
        {filteredTodayData.map((group) => {
          const experiment = group!.experiment as unknown as IExperiment;
          const box = experiment.boxId as unknown as IBox;
          const tasks = group!.tasks as unknown as ITask[];

          return (
            <Card key={experiment._id?.toString()}>
              <CardHeader>
                <CardTitle className="text-xl">
                  {getLocalized(experiment.name, language)}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {getLocalized(box.name, language)}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <button
                      key={task._id?.toString()}
                      onClick={() => setSelectedTaskId(task._id?.toString()!)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{task.icon}</span>
                        <span className="font-medium">
                          {getLocalized(task.name, language)}
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
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
    </div>
  );
}
