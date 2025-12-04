import { createServerFn } from "@tanstack/react-start";

import { JournalEntry } from "../db/models";
import { serialize } from "../db/serialize";

export const getJournalEntriesByDate = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string; date: string }) => data)
  .handler(async ({ data: { userId, date: dateStr } }) => {
    const date = new Date(dateStr);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const entries = await JournalEntry.find({
      userId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    })
      .populate("experimentId")
      .populate("taskId")
      .sort({ date: -1 })
      .lean();

    return serialize(entries);
  });
