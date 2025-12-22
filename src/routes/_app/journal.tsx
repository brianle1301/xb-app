import React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth-context";
import { getLocalized, useLanguage } from "@/lib/language-context";
import { getJournalEntriesByDate } from "@/server/rpc/journal";
import type { InputBlock } from "@/types/shared";

export const Route = createFileRoute("/_app/journal")({
  component: JournalPage,
  pendingComponent: () => (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner />
    </div>
  ),
});

function JournalPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const userId = user!.id;
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = React.useState(false);

  const today = new Date();
  const dateStr = selectedDate.toISOString().split("T")[0];

  const { data: entries } = useSuspenseQuery({
    queryKey: ["journal", userId, dateStr],
    queryFn: () => getJournalEntriesByDate({ data: { userId, date: dateStr } }),
  });

  return (
    <div className="container max-w-screen-sm mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Log</h1>

      <Drawer open={calendarOpen} onOpenChange={setCalendarOpen}>
        <DrawerTrigger asChild>
          <Button variant="outline" className="w-full justify-start mb-6">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate.toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {language === "es" ? "Seleccionar fecha" : "Select date"}
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex justify-center pb-6">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  setSelectedDate(date);
                  setCalendarOpen(false);
                }
              }}
              disabled={(date) => date > today}
            />
          </div>
        </DrawerContent>
      </Drawer>

      {entries && entries.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarDays className="size-5" />
            </EmptyMedia>
            <EmptyTitle>
              {language === "es"
                ? "No hay entradas"
                : "No entries"}
            </EmptyTitle>
            <EmptyDescription>
              {language === "es"
                ? "No hay entradas para este día"
                : "No log entries for this day"}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <div className="space-y-4">
        {entries?.map((entry) => {
          const task = entry.taskId;
          const experiment = entry.experimentId;
          const time = new Date(entry.date).toLocaleTimeString(
            language === "es" ? "es-ES" : "en-US",
            {
              hour: "2-digit",
              minute: "2-digit",
            },
          );

          // Get input blocks that have responses
          const inputBlocks =
            task.blocks?.filter(
              (b): b is InputBlock =>
                (b.type === "text" || b.type === "number" || b.type === "select") &&
                !!entry.responses?.[b.id],
            ) || [];

          const hasResponses = inputBlocks.length > 0;

          return (
            <Card key={entry._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <DynamicIcon
                      name={task.icon}
                      className="w-6 h-6 text-muted-foreground"
                    />
                    <div>
                      <CardTitle className="text-base">
                        {getLocalized(task.name, language)}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {getLocalized(experiment.name, language)} • {time}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              {hasResponses && (
                <CardContent>
                  <div className="space-y-2">
                    {inputBlocks.map((block) => {
                      const response = entry.responses[block.id];
                      // For select blocks, find the label for the selected value
                      let displayValue: string = response;
                      if (block.type === "select") {
                        const option = block.options.find(
                          (o) => o.value === response,
                        );
                        if (option) {
                          displayValue = getLocalized(option.label, language);
                        }
                      }
                      return (
                        <div key={block.id}>
                          <p className="text-xs text-muted-foreground">
                            {getLocalized(block.label, language)}
                          </p>
                          <p className="text-sm">{displayValue}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
