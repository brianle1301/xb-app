import React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardHeaderText,
  CardLeadingAction,
  CardTitle,
} from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { getLocalized, useLanguage } from "@/lib/language-context";
import { journalEntriesByDateQuery } from "@/queries/journal";
import type { InputBlock } from "@/types/shared";

export const Route = createFileRoute("/_app/journal")({
  loader: async ({ context }) => {
    const today = new Date().toISOString().split("T")[0];
    await context.queryClient.ensureQueryData(journalEntriesByDateQuery(today));
  },
  component: JournalPage,
  pendingComponent: () => (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner />
    </div>
  ),
});

function JournalPage() {
  const { language } = useLanguage();
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = React.useState(false);

  const today = new Date();
  const dateStr = selectedDate.toISOString().split("T")[0];

  const { data: entries } = useSuspenseQuery(
    journalEntriesByDateQuery(dateStr),
  );

  return (
    <div className="w-full max-w-screen-sm mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Log</h1>

      <Drawer open={calendarOpen} onOpenChange={setCalendarOpen}>
        <DrawerTrigger asChild>
          <Button variant="outline" className="w-full justify-start mb-6">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate.toLocaleDateString(
              language === "es" ? "es-ES" : "en-US",
              {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              },
            )}
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <div className="max-w-screen-sm m-auto container flex flex-col items-center">
            <DrawerHeader>
              <DrawerTitle>
                {language === "es" ? "Seleccionar fecha" : "Select date"}
              </DrawerTitle>
            </DrawerHeader>
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
              {language === "es" ? "No hay entradas" : "No entries"}
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
                (b.type === "text" ||
                  b.type === "number" ||
                  b.type === "select") &&
                !!entry.responses?.[b.id],
            ) || [];

          const hasResponses = inputBlocks.length > 0;

          return (
            <Card key={entry._id}>
              <CardHeader>
                <CardLeadingAction>
                  <DynamicIcon
                    name={task.icon}
                    className="w-5 h-5 text-muted-foreground"
                  />
                </CardLeadingAction>
                <CardHeaderText>
                  <CardTitle>{getLocalized(task.name, language)}</CardTitle>
                  <CardDescription>
                    {getLocalized(experiment.name, language)} • {time}
                  </CardDescription>
                </CardHeaderText>
              </CardHeader>
              {hasResponses && (
                <CardContent>
                  <div className="space-y-2">
                    {inputBlocks.map((block) => {
                      const response = entry.responses[block.id];
                      // For select blocks, find the label(s) for the selected value(s)
                      let displayValue: string = response;
                      if (block.type === "select") {
                        // Handle multiple selections (comma-separated values)
                        const values = response
                          ? response.split(",").filter(Boolean)
                          : [];
                        const labels = values
                          .map((v) => {
                            const option = block.options.find(
                              (o) => o.value === v,
                            );
                            return option
                              ? getLocalized(option.label, language)
                              : v;
                          })
                          .filter(Boolean);
                        displayValue =
                          labels.length > 0 ? labels.join(", ") : response;
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
