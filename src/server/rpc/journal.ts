import { createServerFn } from "@tanstack/react-start";

import { connectDB } from "../db/connection";
import { JournalEntry } from "../db/models";

export const getJournalEntriesByDate = createServerFn({ method: "POST" })
  .inputValidator((data: string) => data)
  .handler(async ({ data: dateStr }) => {
    await connectDB();
    const date = new Date(dateStr);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const entries = await JournalEntry.find({
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    })
      .populate("experimentId")
      .populate("taskId")
      .sort({ date: -1 })
      .lean();

    return JSON.parse(JSON.stringify(entries));
  },
);
