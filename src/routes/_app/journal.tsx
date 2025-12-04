import React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
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

  const dateStr = selectedDate.toISOString().split("T")[0];

  const { data: entries } = useSuspenseQuery({
    queryKey: ["journal", userId, dateStr],
    queryFn: () => getJournalEntriesByDate({ data: { userId, date: dateStr } }),
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="container max-w-screen-sm mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">
        {language === "es" ? "Diario" : "Journal"}
      </h1>

      <div className="flex justify-center mb-6">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && setSelectedDate(date)}
          disabled={(date) => date > new Date()}
        />
      </div>

      <p className="text-center text-sm text-muted-foreground mb-6">
        {formatDate(selectedDate)}
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
          const task = entry.taskId as any;
          const experiment = entry.experimentId as any;
          const time = new Date(entry.date).toLocaleTimeString(
            language === "es" ? "es-ES" : "en-US",
            {
              hour: "2-digit",
              minute: "2-digit",
            },
          );

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
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{entry.response}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
