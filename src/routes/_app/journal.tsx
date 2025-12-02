import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { getLocalized, useLanguage } from "@/lib/language-context";
import type { IExperiment, IJournalEntry, ITask } from "@/server/db/models";
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
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );

  const { data: entries } = useSuspenseQuery({
    queryKey: ["journal", selectedDate],
    queryFn: () => getJournalEntriesByDate(selectedDate),
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
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

      <div className="mb-6">
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="max-w-xs"
        />
        <p className="text-sm text-muted-foreground mt-2">
          {formatDate(selectedDate)}
        </p>
      </div>

      {entries && entries.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {language === "es"
                ? "No hay entradas para este día"
                : "No entries for this day"}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {(entries as unknown as IJournalEntry[])?.map((entry) => {
          const task = entry.taskId as unknown as ITask;
          const experiment = entry.experimentId as unknown as IExperiment;
          const time = new Date(entry.date).toLocaleTimeString(
            language === "es" ? "es-ES" : "en-US",
            {
              hour: "2-digit",
              minute: "2-digit",
            },
          );

          return (
            <Card key={entry._id?.toString()}>
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
