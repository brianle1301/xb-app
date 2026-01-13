import { queryOptions } from "@tanstack/react-query";

import { getJournalEntriesByDate } from "@/server/rpc/journal";

export const journalEntriesByDateQuery = (date: string) =>
  queryOptions({
    queryKey: ["journal", "entries", "byDate", date],
    queryFn: () => getJournalEntriesByDate({ data: { date } }),
  });
