import React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { InputBlock, SelectBlock } from "@/types/shared";

export const Route = createFileRoute("/_app/journal")({
  component: JournalPage,
  pendingComponent: () => (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner />
    </div>
  ),
});

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function JournalPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const userId = user!.id;
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [weekStart, setWeekStart] = React.useState<Date>(() =>
    getStartOfWeek(new Date()),
  );

  const today = new Date();
  const currentWeekStart = getStartOfWeek(today);
  const isCurrentWeek = isSameDay(weekStart, currentWeekStart);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const dateStr = selectedDate.toISOString().split("T")[0];

  const { data: entries } = useSuspenseQuery({
    queryKey: ["journal", userId, dateStr],
    queryFn: () => getJournalEntriesByDate({ data: { userId, date: dateStr } }),
  });

  const dayLabels =
    language === "es"
      ? ["D", "L", "M", "X", "J", "V", "S"]
      : ["S", "M", "T", "W", "T", "F", "S"];

  const goToPreviousWeek = () => {
    setWeekStart(addDays(weekStart, -7));
  };

  const goToNextWeek = () => {
    setWeekStart(addDays(weekStart, 7));
  };

  return (
    <div className="container max-w-screen-sm mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">
        {language === "es" ? "Diario" : "Journal"}
      </h1>

      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex gap-1">
          {weekDays.map((day, index) => {
            const isSelected = isSameDay(day, selectedDate);
            const isFuture = day > today;
            const isToday = isSameDay(day, today);

            return (
              <button
                key={index}
                disabled={isFuture}
                onClick={() => setSelectedDate(day)}
                className={`flex flex-col items-center px-2 py-1 rounded-lg min-w-[40px] transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : isFuture
                      ? "text-muted-foreground/50 cursor-not-allowed"
                      : "hover:bg-muted"
                }`}
              >
                <span className="text-xs font-medium">{dayLabels[index]}</span>
                <span
                  className={`text-sm font-semibold ${isToday && !isSelected ? "text-primary" : ""}`}
                >
                  {day.getDate()}
                </span>
              </button>
            );
          })}
        </div>

        {isCurrentWeek ? (
          <div className="w-10" />
        ) : (
          <Button variant="ghost" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground mb-6">
        {selectedDate.toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

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
                : "No journal entries for this day"}
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

          // Get input/select blocks that have responses
          const inputBlocks =
            task.blocks?.filter(
              (b): b is InputBlock | SelectBlock =>
                (b.type === "input" || b.type === "select") &&
                !!entry.responses?.[b.id],
            ) || [];

          const hasResponses = inputBlocks.length > 0;

          return (
            <Card key={entry._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{task.icon}</span>
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
