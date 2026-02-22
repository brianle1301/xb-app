import { createFileRoute } from "@tanstack/react-router";

import { sendDailyReminders } from "@/server/notifications";

export const Route = createFileRoute("/api/send-daily-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get("x-cron-secret");
        if (secret !== process.env.CRON_SECRET) {
          return new Response("Unauthorized", { status: 401 });
        }

        const result = await sendDailyReminders();
        return Response.json(result);
      },
    },
  },
});
